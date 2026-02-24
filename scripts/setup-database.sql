-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Maps table (projects)
CREATE TABLE IF NOT EXISTS maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  center_lat DECIMAL(10, 7),
  center_lng DECIMAL(10, 7),
  zoom_level INTEGER DEFAULT 15,
  bbox GEOMETRY(POLYGON, 4326),
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster user_id lookups
CREATE INDEX IF NOT EXISTS maps_user_id_idx ON maps(user_id);
CREATE INDEX IF NOT EXISTS maps_bbox_idx ON maps USING GIST(bbox);

-- Roads table (PostGIS Geometry)
CREATE TABLE IF NOT EXISTS roads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  osm_id BIGINT,
  geometry GEOMETRY(LINESTRING, 4326) NOT NULL,
  road_type VARCHAR(50),
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial index for roads
CREATE INDEX IF NOT EXISTS roads_geometry_idx ON roads USING GIST(geometry);
CREATE INDEX IF NOT EXISTS roads_map_id_idx ON roads(map_id);

-- Facilities table (shops/restaurants)
CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  location GEOMETRY(POINT, 4326) NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial index for facilities
CREATE INDEX IF NOT EXISTS facilities_geometry_idx ON facilities USING GIST(location);
CREATE INDEX IF NOT EXISTS facilities_map_id_idx ON facilities(map_id);

-- Enable RLS (Row Level Security)
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE roads ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maps
CREATE POLICY "Users can view their own maps"
  ON maps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own maps"
  ON maps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own maps"
  ON maps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own maps"
  ON maps FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for roads
CREATE POLICY "Users can view roads in their maps"
  ON roads FOR SELECT
  USING (map_id IN (SELECT id FROM maps WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage roads in their maps"
  ON roads FOR INSERT
  WITH CHECK (map_id IN (SELECT id FROM maps WHERE user_id = auth.uid()));

CREATE POLICY "Users can update roads in their maps"
  ON roads FOR UPDATE
  USING (map_id IN (SELECT id FROM maps WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete roads in their maps"
  ON roads FOR DELETE
  USING (map_id IN (SELECT id FROM maps WHERE user_id = auth.uid()));

-- RLS Policies for facilities
CREATE POLICY "Users can view facilities in their maps"
  ON facilities FOR SELECT
  USING (map_id IN (SELECT id FROM maps WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage facilities in their maps"
  ON facilities FOR INSERT
  WITH CHECK (map_id IN (SELECT id FROM maps WHERE user_id = auth.uid()));

CREATE POLICY "Users can update facilities in their maps"
  ON facilities FOR UPDATE
  USING (map_id IN (SELECT id FROM maps WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete facilities in their maps"
  ON facilities FOR DELETE
  USING (map_id IN (SELECT id FROM maps WHERE user_id = auth.uid()));
