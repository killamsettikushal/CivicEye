/*
# Voice complaints table for multilingual AI-powered voice complaint feature

1. New Table
- `voice_complaints`: Stores voice-based complaints with audio, transcripts, translations, and AI classification.
  - id (uuid, PK)
  - reporter_id (uuid, references profiles)
  - audio_path (text) — path to the audio file in Supabase Storage
  - audio_url (text) — public/signed URL to the audio file
  - detected_language (text) — language detected by Gemini
  - original_transcript (text) — speech-to-text in original language
  - english_translation (text) — English translation
  - confidence (real) — confidence score from Gemini (0-1)
  - category (text) — AI-classified complaint category
  - severity (text) — low, medium, high, critical
  - department (text) — responsible government department
  - priority_score (integer) — priority score 1-100
  - lat (double precision)
  - lng (double precision)
  - address (text)
  - city (text)
  - evidence_urls (text[]) — any uploaded images
  - created_at (timestamptz, default now())

2. Security
- RLS enabled.
- Citizens can insert and read their own voice complaints.
- Admins can read all voice complaints.

3. Indexes
- voice_complaints(reporter_id) for per-user lookups.
- voice_complaints(created_at) for chronological ordering.
*/

CREATE TABLE IF NOT EXISTS voice_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  audio_path text DEFAULT '',
  audio_url text DEFAULT '',
  detected_language text DEFAULT '',
  original_transcript text DEFAULT '',
  english_translation text DEFAULT '',
  confidence real,
  category text DEFAULT '',
  severity text DEFAULT 'medium',
  department text DEFAULT '',
  priority_score integer DEFAULT 50,
  lat double precision,
  lng double precision,
  address text DEFAULT '',
  city text DEFAULT '',
  evidence_urls text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE voice_complaints ENABLE ROW LEVEL SECURITY;

-- Citizens can read their own voice complaints
DROP POLICY IF EXISTS "select_own_voice_complaints" ON voice_complaints;
CREATE POLICY "select_own_voice_complaints" ON voice_complaints FOR SELECT
  TO authenticated USING (auth.uid() = reporter_id);

-- Admins can read ALL voice complaints
DROP POLICY IF EXISTS "admin_read_all_voice_complaints" ON voice_complaints;
CREATE POLICY "admin_read_all_voice_complaints" ON voice_complaints FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Citizens can insert their own voice complaints
DROP POLICY IF EXISTS "insert_own_voice_complaints" ON voice_complaints;
CREATE POLICY "insert_own_voice_complaints" ON voice_complaints FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- Citizens can update their own voice complaints
DROP POLICY IF EXISTS "update_own_voice_complaints" ON voice_complaints;
CREATE POLICY "update_own_voice_complaints" ON voice_complaints FOR UPDATE
  TO authenticated USING (auth.uid() = reporter_id) WITH CHECK (auth.uid() = reporter_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voice_complaints_reporter_id ON voice_complaints(reporter_id);
CREATE INDEX IF NOT EXISTS idx_voice_complaints_created_at ON voice_complaints(created_at DESC);
