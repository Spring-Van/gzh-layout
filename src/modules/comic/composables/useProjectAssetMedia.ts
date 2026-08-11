import { ref, type Ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { comicDb } from '@/api/comic';
import { processImage, type ImageStorageMode } from '@comic/services/uploadService';
import { useToast } from '@comic/composables/useToast';
import type { MaterialItem, ProjectAsset } from '@comic/types';

interface MaterialLibraryHandle {
  loadMaterials?: () => void | Promise<void>;
}

export function useProjectAssetMedia(
  projectId: string,
  assets: Ref<ProjectAsset[]>,
  selectedAsset: Ref<ProjectAsset | null>,
) {
  const toast = useToast();
  const fileInputRef = ref<HTMLInputElement | null>(null);
  const outfitFileInputRef = ref<HTMLInputElement | null>(null);
  const uploadingImage = ref(false);
  const uploadingOutfitId = ref<string | null>(null);
  const syncingImage = ref(false);
  const storageMode = ref<ImageStorageMode>('local');
  const showMaterialLibrary = ref(false);
  const materialLibraryRef = ref<MaterialLibraryHandle | null>(null);
  const materialTarget = ref<string>('character');
  const charImageFromLibrary = ref(false);
  const showImagePreview = ref(false);
  const previewImages = ref<string[]>([]);
  const previewImageIndex = ref(0);
  const previewImageAlt = ref('');

  async function saveAsset(asset: ProjectAsset, fields?: string[]) {
    const update: Partial<ProjectAsset> & { updatedAt: number } = { updatedAt: Date.now() };
    if (!fields || fields.includes('description')) update.description = asset.description;
    if (!fields || fields.includes('referenceImageDescs')) update.referenceImageDescs = clone(asset.referenceImageDescs || []);
    if (!fields || fields.includes('referenceImages')) update.referenceImages = clone(asset.referenceImages);
    if (!fields || fields.includes('outfits')) update.outfits = clone(asset.outfits || []);
    if (!fields || fields.includes('insertCharacterDescription')) update.insertCharacterDescription = asset.insertCharacterDescription;
    if (!fields || fields.includes('insertOutfitDescription')) update.insertOutfitDescription = asset.insertOutfitDescription;
    await comicDb.saveProjectAsset(clone({ ...asset, ...update }));
  }

  async function saveOutfits() {
    if (selectedAsset.value) await saveAsset(selectedAsset.value, ['outfits', 'referenceImageDescs']);
  }

  async function refreshCharImageFromLibrary() {
    charImageFromLibrary.value = false;
    const url = selectedAsset.value?.referenceImages?.[0];
    if (!url) return;
    charImageFromLibrary.value = (await comicDb.getAllMaterials()).some(material => material.url === url);
  }

  async function refreshOutfitsLibraryStatus() {
    if (!selectedAsset.value?.outfits) return;
    const materials = await comicDb.getAllMaterials();
    for (const outfit of selectedAsset.value.outfits) {
      outfit.syncedToLibrary = Boolean(outfit.referenceImage && materials.some(material => material.url === outfit.referenceImage));
    }
  }

  function handleAssetDescInput(value: string) {
    if (!selectedAsset.value) return;
    selectedAsset.value.description = value;
    void saveAsset(selectedAsset.value, ['description']);
  }

  function handleCharRefDescInput(value: string) {
    if (!selectedAsset.value) return;
    selectedAsset.value.referenceImageDescs ||= [''];
    selectedAsset.value.referenceImageDescs[0] = value;
    void saveAsset(selectedAsset.value, ['referenceImageDescs']);
  }

  function handleOutfitNameInput(id: string, value: string) {
    const outfit = findOutfit(id);
    if (outfit) outfit.name = value;
  }

  function handleOutfitDescInput(id: string, value: string) {
    const outfit = findOutfit(id);
    if (outfit) outfit.description = value;
  }

  function handleOutfitRefDescInput(id: string, value: string) {
    const outfit = findOutfit(id);
    if (outfit) outfit.referenceImageDesc = value;
  }

  async function toggleInsertCharacterDescription() {
    if (!selectedAsset.value) return;
    selectedAsset.value.insertCharacterDescription = selectedAsset.value.insertCharacterDescription !== true;
    await saveAsset(selectedAsset.value, ['insertCharacterDescription']);
  }

  async function toggleInsertOutfitDescription() {
    if (!selectedAsset.value) return;
    selectedAsset.value.insertOutfitDescription = selectedAsset.value.insertOutfitDescription === false;
    await saveAsset(selectedAsset.value, ['insertOutfitDescription']);
  }

  function triggerUpload() {
    materialTarget.value = 'character';
    fileInputRef.value?.click();
  }

  async function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    target.value = '';
    if (!file || !selectedAsset.value) return;
    uploadingImage.value = true;
    try {
      const url = await uploadImage(file);
      if (!url) return;
      selectedAsset.value.referenceImages = [url];
      charImageFromLibrary.value = false;
      await saveAsset(selectedAsset.value, ['referenceImages']);
      toast.success(storageMode.value === 'local' ? '已本地存储' : '上传成功');
    } finally {
      uploadingImage.value = false;
    }
  }

  async function removeRefImage() {
    if (!selectedAsset.value) return;
    selectedAsset.value.referenceImages = [];
    charImageFromLibrary.value = false;
    await saveAsset(selectedAsset.value, ['referenceImages']);
  }

  function openMaterialLibrary(target: string) {
    materialTarget.value = target;
    showMaterialLibrary.value = true;
  }

  async function handleSelectFromMaterial(url: string) {
    showMaterialLibrary.value = false;
    if (materialTarget.value === 'character') {
      if (!selectedAsset.value) return;
      selectedAsset.value.referenceImages = [url];
      charImageFromLibrary.value = true;
      await saveAsset(selectedAsset.value, ['referenceImages']);
      toast.success('已设置参考图');
      return;
    }
    const outfit = findOutfit(materialTarget.value);
    if (!outfit) return;
    outfit.referenceImage = url;
    outfit.syncedToLibrary = true;
    await saveOutfits();
    toast.success('已设置服装参考图');
  }

  async function syncToMaterial() {
    const asset = selectedAsset.value;
    const url = asset?.referenceImages[0];
    if (!asset || !url) return;
    syncingImage.value = true;
    try {
      if (await materialExists(url)) {
        charImageFromLibrary.value = true;
        toast.info('该图片已在素材库中');
        return;
      }
      await saveMaterial({
        id: uuidv4(), projectId, url, name: asset.name || '未命名', assetType: 'character',
        sourceAssetId: asset.id, createdAt: Date.now(),
      });
      charImageFromLibrary.value = true;
      toast.success('已同步至素材库');
    } catch {
      toast.error('同步失败');
    } finally {
      syncingImage.value = false;
    }
  }

  function triggerOutfitUpload(outfitId: string) {
    materialTarget.value = outfitId;
    outfitFileInputRef.value?.click();
  }

  async function handleOutfitFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    target.value = '';
    if (!file) return;
    const outfitId = materialTarget.value;
    const outfit = findOutfit(outfitId);
    if (!outfit) return;
    uploadingOutfitId.value = outfitId;
    try {
      const url = await uploadImage(file);
      if (!url) return;
      outfit.referenceImage = url;
      outfit.syncedToLibrary = false;
      await saveOutfits();
      toast.success(storageMode.value === 'local' ? '已本地存储' : '上传成功');
    } finally {
      uploadingOutfitId.value = null;
    }
  }

  function openOutfitMaterial(outfitId: string) {
    openMaterialLibrary(outfitId);
  }

  async function removeOutfitImage(outfitId: string) {
    const outfit = findOutfit(outfitId);
    if (!outfit) return;
    outfit.referenceImage = '';
    outfit.syncedToLibrary = false;
    await saveOutfits();
  }

  async function handleDeleteOutfit(outfitId: string) {
    if (!selectedAsset.value?.outfits || !confirm('确定要删除该服装吗？')) return;
    selectedAsset.value.outfits = selectedAsset.value.outfits.filter(outfit => outfit.id !== outfitId);
    await saveOutfits();
    toast.success('已删除服装');
  }

  async function handleDeleteAsset(asset: ProjectAsset) {
    if (!confirm(`确定要删除资产「${asset.name || '未命名'}」吗？该资产下的服装也会一并删除。`)) return;
    await comicDb.deleteProjectAsset(asset.id);
    assets.value = assets.value.filter(item => item.id !== asset.id);
    if (selectedAsset.value?.id === asset.id) selectedAsset.value = assets.value[0] || null;
    toast.success('已删除资产');
  }

  async function syncOutfitToMaterial(outfitId: string) {
    const asset = selectedAsset.value;
    const outfit = findOutfit(outfitId);
    if (!asset || !outfit?.referenceImage) return;
    syncingImage.value = true;
    try {
      if (await materialExists(outfit.referenceImage)) {
        outfit.syncedToLibrary = true;
        await saveOutfits();
        toast.info('该图片已在素材库中');
        return;
      }
      await saveMaterial({
        id: uuidv4(), projectId, url: outfit.referenceImage,
        name: `${asset.name || '未命名'}-${outfit.name}`, assetType: 'outfit',
        sourceAssetId: asset.id, sourceOutfitId: outfit.id, createdAt: Date.now(),
      });
      outfit.syncedToLibrary = true;
      await saveOutfits();
      toast.success('已同步至素材库');
    } catch {
      toast.error('同步失败');
    } finally {
      syncingImage.value = false;
    }
  }

  function openImagePreview(images: string[], index: number, alt: string) {
    previewImages.value = [...images];
    previewImageIndex.value = index;
    previewImageAlt.value = alt;
    showImagePreview.value = true;
  }

  function findOutfit(id: string) {
    return selectedAsset.value?.outfits?.find(outfit => outfit.id === id);
  }

  async function uploadImage(file: File) {
    try {
      const result = await processImage(file, storageMode.value);
      if (!result.success || !result.url) {
        toast.error(result.error || '图片处理失败');
        return null;
      }
      return result.url;
    } catch (error) {
      console.error('[资产参考图] 图片处理失败:', error);
      toast.error(error instanceof Error ? error.message : '图片处理失败');
      return null;
    }
  }

  async function materialExists(url: string) {
    return (await comicDb.getAllMaterials()).some(material => material.url === url);
  }

  async function saveMaterial(item: MaterialItem) {
    await comicDb.saveMaterial(item);
    await materialLibraryRef.value?.loadMaterials?.();
  }

  return {
    fileInputRef, outfitFileInputRef, uploadingImage, uploadingOutfitId, syncingImage, storageMode,
    showMaterialLibrary, materialLibraryRef, charImageFromLibrary,
    showImagePreview, previewImages, previewImageIndex, previewImageAlt,
    saveAsset, saveOutfits, refreshCharImageFromLibrary, refreshOutfitsLibraryStatus,
    handleAssetDescInput, handleCharRefDescInput, handleOutfitNameInput,
    handleOutfitDescInput, handleOutfitRefDescInput,
    toggleInsertCharacterDescription, toggleInsertOutfitDescription,
    triggerUpload, handleFileUpload, removeRefImage, openMaterialLibrary, handleSelectFromMaterial, syncToMaterial,
    triggerOutfitUpload, handleOutfitFileUpload, openOutfitMaterial, removeOutfitImage,
    handleDeleteOutfit, handleDeleteAsset, syncOutfitToMaterial, openImagePreview,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
