import { buildPanelRefManifest } from "./src/modules/comic/services/panelRefManifest.ts";
import { resolvePanelAssetStates, resolvePanelRefImage } from "./src/modules/comic/services/panelPromptService.ts";

const character = { id: "a1", name: "萧薰儿", type: "character", aliases: [], fixedTraits: [], variants: [
  { id: "v1", name: "便装", description: "日常便装", generatedImageIds: ["casual-1"] },
  { id: "v2", name: "战斗服", description: "战斗装备", generatedImageIds: ["battle-1", "battle-2"] },
], status: "confirmed", sourceChapterIds: [], createdAt: 1, updatedAt: 1 };
const scene = { id: "a2", name: "广场", type: "scene", aliases: [], fixedTraits: [], variants: [{ id: "v3", name: "白天", generatedImageIds: ["plaza-1"] }], status: "confirmed", sourceChapterIds: [], createdAt: 1, updatedAt: 1 };
const prop = { id: "a3", name: "石碑", type: "prop", aliases: [], fixedTraits: [], variants: [{ id: "v4", name: "常态", generatedImageIds: ["stone-1"] }], status: "confirmed", sourceChapterIds: [], createdAt: 1, updatedAt: 1 };
const assets = [character, scene, prop];
const binding = (assetId, variantId) => ({ assetId, assetName: "", matchSource: "model", visualVersionId: variantId });
const panel = { id: "p1", order: 1, content: "x", assetBindings: [binding("a1","v2"), binding("a2","v3"), binding("a3","v4")], cells: [ { assetBindings: [binding("a1","v1"), binding("a2","v3")] }, { assetBindings: [binding("a1","v2"), binding("a3","v4")] } ] };
const states = resolvePanelAssetStates(panel, assets);
console.log(JSON.stringify(states.map(s => ({ type: s.asset.type, variant: s.variant.id, images: s.variant.generatedImageIds, resolved: resolvePanelRefImage(s.variant, s.binding ?? {}) })), null, 2));
const blocks = [ { id: "b2", name: "风格", description: "d", enableRefImages: true, referenceImages: ["style-1","style-2"], insertPosition: "front", sortOrder: 1 } ];
console.log(JSON.stringify(buildPanelRefManifest({ panel, assets, sharedBlocks: blocks }).images));
