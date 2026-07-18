import api from "./axios";

export interface MessageThread {
  id: string;
  patient_id: string;
  provider_id: string;
  subject: string | null;
  last_message_at: string | null;
  patient_name: string | null;
  provider_name: string | null;
  last_message: string | null;
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string | null;
  sent_at: string;
  read_at: string | null;
  edited_at: string | null;
  mine: boolean;
}

export interface ThreadDetail {
  thread: {
    id: string;
    subject: string | null;
    patient_id: string;
    provider_id: string;
    patient_name: string | null;
    provider_name: string | null;
  };
  messages: ChatMessage[];
}

export const listThreads = () =>
  api.get<{ success: boolean; data: MessageThread[] }>(
    "/healthcare/messages/threads"
  );

export const createThread = (data: {
  provider_id?: string;
  patient_id?: string;
  subject?: string;
  body?: string;
}) =>
  api.post<{ success: boolean; data: { id: string } }>(
    "/healthcare/messages/threads",
    data
  );

export const getThreadMessages = (threadId: string) =>
  api.get<{ success: boolean; data: ThreadDetail }>(
    `/healthcare/messages/threads/${threadId}/messages`
  );

export const sendMessage = (threadId: string, body: string) =>
  api.post<{ success: boolean; data: { id: string } }>(
    `/healthcare/messages/threads/${threadId}/messages`,
    { body }
  );

export const editMessage = (messageId: string, body: string) =>
  api.patch<{ success: boolean; data: { id: string } }>(
    `/healthcare/messages/messages/${messageId}`,
    { body }
  );

export const deleteMessage = (messageId: string) =>
  api.delete<{ success: boolean; data: { id: string } }>(
    `/healthcare/messages/messages/${messageId}`
  );
