export interface NormalizedBlueprint {
  id: string;
  name: string;
  rarity: string | null;
  description?: string;
  value?: number;
  itemId?: string;
  assetId?: string;
  [key: string]: any;
}