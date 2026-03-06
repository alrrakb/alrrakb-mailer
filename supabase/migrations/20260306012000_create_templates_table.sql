-- Alter existing templates table to match requested schema
ALTER TABLE public.templates 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Safely rename content_html to html_content if it exists
DO $$ 
BEGIN
  IF EXISTS(SELECT *
    FROM information_schema.columns
    WHERE table_name='templates' and column_name='content_html')
  THEN
      ALTER TABLE public.templates RENAME COLUMN content_html TO html_content;
  END IF;
END $$;

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Drop prior policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can view their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.templates;

-- Create Strict RLS Policies
CREATE POLICY "Users can insert their own templates" 
    ON public.templates FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own templates" 
    ON public.templates FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" 
    ON public.templates FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" 
    ON public.templates FOR DELETE 
    USING (auth.uid() = user_id);

-- Optional: Create index for faster fetches by user
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.templates(user_id);
