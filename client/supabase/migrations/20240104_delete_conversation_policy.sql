-- Allow conversation participants to delete a conversation (and its cascaded data).

DROP POLICY IF EXISTS conversations_delete_participant ON public.conversations;
CREATE POLICY conversations_delete_participant
  ON public.conversations
  FOR DELETE
  TO authenticated
  USING (public.is_conversation_participant(id, auth.uid()));
