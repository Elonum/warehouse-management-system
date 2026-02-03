import React, { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useI18n } from '@/lib/i18n';
import { Upload, X, Star, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];

export default function ProductImageUpload({ 
  images = [], 
  onImagesChange,
  productId = null 
}) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const uploadMutation = useMutation({
    mutationFn: (file) => api.products.uploadImage(file),
    onSuccess: (data) => {
      const newImagePath = data.filePath;
      // Create temporary image object with URL for immediate display
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
      const imageUrl = `${baseUrl}/files?path=${encodeURIComponent(newImagePath)}`;
      const newImage = {
        filePath: newImagePath,
        imageUrl: imageUrl,
        displayOrder: images.length,
        isMain: images.length === 0, // First image is main by default
      };
      onImagesChange([...images, newImage]);
      setUploadError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setUploadError(err.message || t('products.images.uploadFailed'));
      } else {
        setUploadError(t('products.images.uploadFailed'));
      }
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
      // Remove from local state immediately
      onImagesChange(images.filter(img => {
        const imgId = typeof img === 'object' ? img.imageId : null;
        return imgId !== variables.imageId;
      }));
      
      // Reload images from server to ensure consistency
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
      console.error('Failed to delete image:', err);
      setUploadError(err instanceof ApiError ? err.message : t('products.images.deleteFailed'));
    },
  });

  const setMainImageMutation = useMutation({
    mutationFn: ({ productId, imageId }) => api.products.setImageAsMain(productId, imageId),
    onSuccess: async (_, variables) => {
      // Update local state to reflect main image change
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
      
      // Reload images from server to get updated state
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
    
    // Reset input
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
      // For new products, just remove from local state
      const imagePath = typeof image === 'string' ? image : image.filePath;
      onImagesChange(images.filter(img => {
        const imgPath = typeof img === 'string' ? img : img.filePath;
        return imgPath !== imagePath;
      }));
      return;
    }

    if (window.confirm(t('products.images.deleteConfirm'))) {
      deleteImageMutation.mutate({ productId, imageId: image.imageId });
    }
  }, [productId, images, onImagesChange, deleteImageMutation, t]);

  const handleSetMain = useCallback(async (image) => {
    if (!productId || !image.imageId) return;
    setMainImageMutation.mutate({ productId, imageId: image.imageId });
  }, [productId, setMainImageMutation]);

  const getImageUrl = (image) => {
    if (typeof image === 'string') {
      // Newly uploaded image path
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
      return `${baseUrl}/files?path=${encodeURIComponent(image)}`;
    }
    if (image.imageUrl) {
      return image.imageUrl;
    }
    // Fallback: construct URL from filePath
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
    return `${baseUrl}/files?path=${encodeURIComponent(image.filePath)}`;
  };

  const getImagePath = (image) => {
    return typeof image === 'string' ? image : image.filePath;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('products.form.images')}</Label>
        
        {/* Upload Area */}
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

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((image, index) => {
            const imageUrl = getImageUrl(image);
            const imagePath = getImagePath(image);
            const isMain = typeof image === 'object' && image.isMain;
            const imageId = typeof image === 'object' ? image.imageId : null;

            return (
              <div
                key={imagePath || imageId || index}
                className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
              >
                <img
                  src={imageUrl}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ddd"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999"%3EImage%3C/text%3E%3C/svg%3E';
                  }}
                />
                
                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {productId && imageId && !isMain && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSetMain(image)}
                      className="h-8"
                      title={t('products.images.setAsMain')}
                    >
                      <Star className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteImage(image)}
                    className="h-8"
                    title={t('common.delete')}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>

                {/* Main badge */}
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
    </div>
  );
}

