-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON quotes;
DROP POLICY IF EXISTS "Enable insert access for all users" ON quotes;
DROP POLICY IF EXISTS "Enable update access for all users" ON quotes;
DROP POLICY IF EXISTS "Enable delete access for all users" ON quotes;

-- Create new policies that allow public access for basic operations
CREATE POLICY "Enable read access for all users"
    ON quotes FOR SELECT
    USING (true);

CREATE POLICY "Enable insert access for basic quotes"
    ON quotes FOR INSERT
    WITH CHECK (
        -- Only allow inserting basic quotes without requiring auth
        quote_type = 'basic'
    );

CREATE POLICY "Enable update access for basic quotes"
    ON quotes FOR UPDATE
    USING (quote_type = 'basic')
    WITH CHECK (quote_type = 'basic');

CREATE POLICY "Enable delete access for basic quotes"
    ON quotes FOR DELETE
    USING (quote_type = 'basic');

-- Ensure RLS is enabled
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY; 