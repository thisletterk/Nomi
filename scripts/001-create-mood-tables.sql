-- Create mood_types table for predefined mood types
CREATE TABLE IF NOT EXISTS mood_types (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    color VARCHAR(20) NOT NULL,
    value INTEGER NOT NULL CHECK (value >= 1 AND value <= 5)
);

-- Insert predefined mood types
INSERT INTO mood_types (id, name, emoji, color, value) VALUES
    ('very-sad', 'Very Sad', '😢', '#ef4444', 1),
    ('sad', 'Sad', '😔', '#f97316', 2),
    ('neutral', 'Neutral', '😐', '#eab308', 3),
    ('happy', 'Happy', '😊', '#22c55e', 4),
    ('very-happy', 'Very Happy', '😄', '#10b981', 5)
ON CONFLICT (id) DO NOTHING;

-- Create mood_entries table
CREATE TABLE IF NOT EXISTS mood_entries (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    mood_type_id VARCHAR(50) NOT NULL REFERENCES mood_types(id),
    intensity INTEGER NOT NULL CHECK (intensity >= 1 AND intensity <= 5),
    note TEXT,
    date DATE NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON mood_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_date ON mood_entries(date);
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date ON mood_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_mood_entries_timestamp ON mood_entries(timestamp);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mood_entries_updated_at 
    BEFORE UPDATE ON mood_entries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
