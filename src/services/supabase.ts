import { createClient } from '@supabase/supabase-js';
import type { Block } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://tydtxkngmtkzpigenvwp.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_Bwu_auaTtXHQmhnTVIXFGw_YKpD795n';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function loadBlocksFromSupabase(): Promise<Block[] | null> {
  const { data, error } = await supabase
    .from('learning_blocks')
    .select('payload')
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('Supabase load fallback:', error.message);
    return null;
  }

  return (data ?? []).map((row) => row.payload as Block).filter(Boolean);
}

export async function saveBlockToSupabase(block: Block) {
  const { error } = await supabase.from('learning_blocks').upsert({
    id: block.id,
    title: block.title,
    topic: block.topic,
    payload: block,
    updated_at: new Date().toISOString()
  });

  if (error) {
    console.warn('Supabase save fallback:', error.message);
  }
}

