// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { supabaseServer } from '@/lib/supabaseServer';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

type Role = 'user' | 'assistant';

interface ChatMessage {
  role: Role;
  content: string;
}

interface Metrics {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  tokensPerSecond: number | null;
}

type ServerEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; metrics: Metrics; conversationId?: string };

interface ChatRequestBody {
  messages?: ChatMessage[];
  userId?: string;
  conversationId?: string;
}

interface StreamChunk {
  text?: string;
  // On ne détaille pas plus, on ne consomme que `text`
}

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Symbol.asyncIterator in value
  );
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = (await req.json()) as ChatRequestBody;

    const messages = body.messages ?? [];
    const userId = body.userId;
    let conversationId = body.conversationId ?? null;

    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const lastUserMessage =
      [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

    if (!lastUserMessage) {
      return new Response('No user message provided', { status: 400 });
    }

    // 1) Profil minimal dans `profiles`
    const { error: profileError } = await supabaseServer
      .from('profiles')
      .upsert(
        {
          id: userId,
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      console.error('Error upserting profile:', profileError);
      // on ne bloque pas le chat
    }

    // 2) Conversation si absente
    if (!conversationId) {
      const title =
        lastUserMessage.length > 80
          ? `${lastUserMessage.slice(0, 77)}...`
          : lastUserMessage || 'New chat';

      const { data: conv, error: convError } = await supabaseServer
        .from('conversations')
        .insert({
          user_id: userId,
          title,
        })
        .select('id')
        .single();

      if (convError || !conv) {
        console.error('Error creating conversation:', convError);
        return new Response('Could not create conversation', { status: 500 });
      }

      conversationId = conv.id;
    }

    // 3) Sauvegarde du message USER
    const { error: insertUserError } = await supabaseServer
      .from('messages')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        role: 'user',
        content: lastUserMessage,
      });

    if (insertUserError) {
      console.error('Error inserting user message:', insertUserError);
    }

    // 4) Appel streaming Gemini
    const rawResult = (await ai.models.generateContentStream({
      model: 'gemini-2.0-flash-001',
      contents: [
        {
          role: 'user',
          parts: [{ text: lastUserMessage }],
        },
      ],
    })) as unknown;

    let asyncIterable: AsyncIterable<StreamChunk>;

    if (isAsyncIterable<StreamChunk>(rawResult)) {
      asyncIterable = rawResult;
    } else {
      const maybeWithStream = rawResult as {
        stream?: AsyncIterable<StreamChunk>;
      };

      if (!maybeWithStream.stream) {
        console.error('Gemini result does not expose a stream');
        return new Response('LLM streaming error', { status: 500 });
      }

      asyncIterable = maybeWithStream.stream;
    }

    const encoder = new TextEncoder();
    let assistantFullText = '';
    const startTime = Date.now();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          // lecture progressive du flux
          for await (const chunk of asyncIterable) {
            const textPart = typeof chunk.text === 'string' ? chunk.text : '';

            if (!textPart) continue;

            assistantFullText += textPart;

            const event: ServerEvent = {
              type: 'delta',
              text: textPart,
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          }

          // 5) Métriques approximatives (pas d'appel `response`)
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          const approxOutputTokens =
            assistantFullText.length > 0
              ? Math.round(assistantFullText.length / 4)
              : 0;

          const tokensPerSecond =
            elapsedSeconds > 0 && approxOutputTokens > 0
              ? approxOutputTokens / elapsedSeconds
              : null;

          const metrics: Metrics = {
            inputTokens: null,
            outputTokens: approxOutputTokens,
            totalTokens: approxOutputTokens,
            tokensPerSecond,
          };

          // 6) Sauvegarde du message ASSISTANT
          const { error: insertAssistantError } = await supabaseServer
            .from('messages')
            .insert({
              user_id: userId,
              conversation_id: conversationId,
              role: 'assistant',
              content: assistantFullText,
            });

          if (insertAssistantError) {
            console.error(
              'Error inserting assistant message:',
              insertAssistantError
            );
          }

          const doneEvent: ServerEvent = {
            type: 'done',
            metrics,
            conversationId: conversationId ?? undefined,
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(doneEvent)}\n\n`)
          );
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal error', { status: 500 });
  }
}
