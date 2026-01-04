-- Add unique constraint on quiz_id and question_number for upsert support
ALTER TABLE public.quiz_questions 
ADD CONSTRAINT quiz_questions_quiz_id_question_number_key 
UNIQUE (quiz_id, question_number);