CREATE POLICY "Authenticated users can view profiles."
ON profiles FOR SELECT
USING (auth.role() = 'authenticated');
