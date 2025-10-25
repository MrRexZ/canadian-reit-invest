-- Add foreign key constraint for investments.reit_id referencing reits.id
ALTER TABLE public.investments
ADD CONSTRAINT fk_investments_reit_id
FOREIGN KEY (reit_id) REFERENCES public.reits(id) ON DELETE CASCADE;

-- Add comment to clarify the foreign key relationship
COMMENT ON CONSTRAINT fk_investments_reit_id ON public.investments IS 'Foreign key constraint ensuring reit_id references a valid REIT in the reits table';