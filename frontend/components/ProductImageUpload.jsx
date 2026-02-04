import React, { useState, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useI18n } from '@/lib/i18n';
import { Upload, X, Star, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];

export default function ProductImageUpload({ 
  images = [], 
  onImagesChange,
  productId = null 
}) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: (file) => api.products.uploadImage(file),
    onSuccess: (data) => {
      const normalizedPath = data.filePath.replace(/\\/g, '/');
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
      const imageUrl = `${baseUrl}/files?path=${encodeURIComponent(normalizedPath)}`;
      const newImage = {
        filePath: normalizedPath,
        imageUrl: imageUrl,
        displayOrder: images.length,
        isMain: images.length === 0,
      };
      onImagesChange([...images, newImage]);
      setUploadError('');
    },
    onError: (err) => {
      setUploadError(err instanceof ApiError ? err.message : t('products.images.uploadFailed'));
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async ({ productId, imageId }) => {
      await api.products.deleteImage(productId, imageId);
      return { productId, imageId };
    },
    onSuccess: async (_, variables) => {
      if (variables.productId) {
        try {
          const productImages = await api.products.getImages(variables.productId);
          onImagesChange(productImages || []);
        } catch (err) {
          console.error('Failed to reload images:', err);
          setUploadError(err instanceof ApiError ? err.message : t('products.images.deleteFailed'));
        }
      } else {
        onImagesChange(images.filter(img => {
          const imgId = typeof img === 'object' ? img.imageId : null;
          return imgId !== variables.imageId;
        }));
      }
    },
    onError: (err) => {
      console.error('Failed to delete image:', err);
      setUploadError(err instanceof ApiError ? err.message : t('products.images.deleteFailed'));
    },
  });

  const setMainImageMutation = useMutation({
    mutationFn: ({ productId, imageId }) => api.products.setImageAsMain(productId, imageId),
    onSuccess: async (_, variables) => {
      const updatedImages = images.map(img => {
        if (typeof img === 'object' && img.imageId === variables.imageId) {
          return { ...img, isMain: true };
        }
        if (typeof img === 'object' && img.isMain) {
          return { ...img, isMain: false };
        }
        return img;
      });
      onImagesChange(updatedImages);
      
      if (variables.productId) {
        try {
          const productImages = await api.products.getImages(variables.productId);
          onImagesChange(productImages || []);
        } catch (err) {
          console.error('Failed to reload images:', err);
        }
      }
    },
    onError: (err) => {
      console.error('Failed to set main image:', err);
      setUploadError(err instanceof ApiError ? err.message : t('products.images.setMainFailed'));
    },
  });

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return t('products.images.invalidType');
    }
    if (file.size > MAX_FILE_SIZE) {
      return t('products.images.fileTooLarge', { size: '10' });
    }
    return null;
  };

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploading(true);
    setUploadError('');
    uploadMutation.mutate(file);
    e.target.value = '';
  }, [uploadMutation, t]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploading(true);
    setUploadError('');
    uploadMutation.mutate(file);
  }, [uploadMutation, t]);

  const handleDeleteImage = useCallback(async (image) => {
    if (!productId || !image.imageId) {
      const confirmed = window.confirm(t('products.images.deleteConfirm'));
      if (!confirmed) {
        return;
      }
      const imagePath = typeof image === 'string' ? image : image.filePath;
      onImagesChange(images.filter(img => {
        const imgPath = typeof img === 'string' ? img : img.filePath;
        return imgPath !== imagePath;
      }));
      return;
    }

    const confirmed = window.confirm(t('products.images.deleteConfirm'));
    if (!confirmed) {
      return;
    }
    
    deleteImageMutation.mutate({ productId, imageId: image.imageId });
  }, [productId, images, onImagesChange, deleteImageMutation, t]);

  const handleSetMain = useCallback(async (image) => {
    if (!productId || !image.imageId) return;
    setMainImageMutation.mutate({ productId, imageId: image.imageId });
  }, [productId, setMainImageMutation]);

  const getImageUrl = (image) => {
    if (typeof image === 'string') {
      const normalizedPath = image.replace(/\\/g, '/');
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
      return `${baseUrl}/files?path=${encodeURIComponent(normalizedPath)}`;
    }
    if (image.imageUrl) {
      return image.imageUrl;
    }
    const normalizedPath = (image.filePath || '').replace(/\\/g, '/');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
    return `${baseUrl}/files?path=${encodeURIComponent(normalizedPath)}`;
  };

  const getImagePath = (image) => {
    return typeof image === 'string' ? image : image.filePath;
  };

  useEffect(() => {
    if (!viewerOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' && images.length > 1) {
        setViewerIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        setViewerIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'Escape') {
        setViewerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewerOpen, images.length]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('products.form.images')}</Label>
        
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            "hover:border-slate-400 dark:hover:border-slate-600",
            "border-slate-300 dark:border-slate-700",
            uploading && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id="product-image-upload"
          />
          <label
            htmlFor="product-image-upload"
            className={cn(
              "cursor-pointer flex flex-col items-center gap-2",
              uploading && "cursor-not-allowed"
            )}
          >
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {t('products.images.uploading')}
                </span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {t('products.images.uploadHint')}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-500">
                  {t('products.images.uploadHint2')}
                </span>
              </>
            )}
          </label>
        </div>

        {uploadError && (
          <div className="p-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded">
            {uploadError}
          </div>
        )}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {images.map((image, index) => {
            const imageUrl = getImageUrl(image);
            const imagePath = getImagePath(image);
            const isMain = typeof image === 'object' && image.isMain;
            const imageId = typeof image === 'object' ? image.imageId : null;

            return (
              <div
                key={imagePath || imageId || index}
                className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 cursor-pointer"
                onClick={() => {
                  setViewerIndex(index);
                  setViewerOpen(true);
                }}
              >
                <img
                  src={imageUrl}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  onError={(e) => {
                    console.error('Failed to load image:', imageUrl, image);
                    e.target.style.display = 'none';
                    const parent = e.target.parentElement;
                    if (parent) {
                      const placeholder = document.createElement('div');
                      placeholder.className = 'flex items-center justify-center w-full h-full bg-slate-200 dark:bg-slate-700';
                      placeholder.innerHTML = '<svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                      parent.appendChild(placeholder);
                    }
                  }}
                />
                
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {productId && imageId && !isMain && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetMain(image);
                      }}
                      className="h-8 w-8 p-0 flex items-center justify-center"
                      title={t('products.images.setAsMain')}
                    >
                      <Star className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(image);
                    }}
                    className="h-8 w-8 p-0 flex items-center justify-center"
                    title={t('common.delete')}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>

                {isMain && (
                  <div className="absolute top-2 left-2 bg-amber-500 text-white rounded-full p-1">
                    <Star className="w-3 h-3 fill-current" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent 
          className="max-w-6xl max-h-[95vh] p-0 bg-black/95 border-0"
          onClick={(e) => e.stopPropagation()}
        >
          {images.length > 0 && viewerIndex >= 0 && viewerIndex < images.length && (
            <div className="relative w-full h-[90vh] flex items-center justify-center">
              {images.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 z-10 bg-black/50 hover:bg-black/70 text-white border-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewerIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                  }}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
              )}

              <img
                src={getImageUrl(images[viewerIndex])}
                alt={`Product image ${viewerIndex + 1}`}
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />

              {images.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 z-10 bg-black/50 hover:bg-black/70 text-white border-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewerIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                  }}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white border-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewerOpen(false);
                }}
              >
                <X className="w-5 h-5" />
              </Button>

              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium">
                  {viewerIndex + 1} / {images.length}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
