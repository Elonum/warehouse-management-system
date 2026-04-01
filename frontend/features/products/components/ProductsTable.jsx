import React, { useMemo } from 'react';
import { Package, Eye, MoreHorizontal, Image as ImageIcon, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/ui/DataTable';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function ProductsTable({
  t,
  products,
  isLoading,
  imageIndices,
  onChangeImageIndex,
  onOpenImageViewer,
  onEditProduct,
  onRequestDelete,
}) {
  const columns = useMemo(() => {
    return [
      {
        accessorKey: 'image',
        header: '',
        sortable: false,
        cell: ({ row }) => {
          const product = row.original;
          const allImages = product.images || [];
          const productId = product.productId;
          const currentIndex = imageIndices[productId] || 0;
          const currentImage = allImages[currentIndex] || allImages[0];

          if (!currentImage && allImages.length === 0) {
            return (
              <div className="flex items-center justify-center w-32 h-32 rounded-lg bg-slate-100 dark:bg-slate-800">
                <ImageIcon className="w-8 h-8 text-slate-400" />
              </div>
            );
          }

          const imageUrl =
            currentImage?.imageUrl ||
            `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'}/files?path=${encodeURIComponent(
              currentImage?.filePath || ''
            )}`;

          return (
            <div className="relative group w-32 h-32">
              <div
                className="flex items-center justify-center w-full h-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
                onClick={() => {
                  if (allImages.length > 0) {
                    onOpenImageViewer(product, currentIndex);
                  }
                }}
              >
                <img
                  src={imageUrl}
                  alt={product.article}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const parent = e.target.parentElement;
                    if (parent) {
                      parent.innerHTML =
                        '<div class="flex items-center justify-center w-full h-full"><svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                    }
                  }}
                />
              </div>

              {allImages.length > 1 && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none rounded-lg">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white border-0 pointer-events-auto flex items-center justify-center p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newIndex = currentIndex > 0 ? currentIndex - 1 : allImages.length - 1;
                      onChangeImageIndex(productId, newIndex);
                    }}
                    title={t('common.previous')}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs text-white bg-black/50 px-2 py-1 rounded-full min-w-[3rem] text-center">
                    {currentIndex + 1}/{allImages.length}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white border-0 pointer-events-auto flex items-center justify-center p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newIndex = currentIndex < allImages.length - 1 ? currentIndex + 1 : 0;
                      onChangeImageIndex(productId, newIndex);
                    }}
                    title={t('common.next')}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'article',
        header: t('products.table.article'),
        headerClassName: 'text-center',
        cell: ({ row }) => (
          <div className="flex items-center justify-center h-full">
            <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
              {row.original.article}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'barcode',
        header: t('products.table.barcode'),
        headerClassName: 'text-center',
        cell: ({ row }) => (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800">
                <Package className="w-5 h-5 text-slate-500" />
              </div>
              <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
                {row.original.barcode || '—'}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'unitWeight',
        header: t('products.table.weight'),
        headerClassName: 'text-center',
        cell: ({ row }) => (
          <div className="flex items-center justify-center h-full">
            <span className="text-slate-600 dark:text-slate-400">
              {row.original.unitWeight
                ? `${row.original.unitWeight} ${t('common.unitGrams')}`
                : '—'}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'reorderPoint',
        header: t('products.table.reorderPoint'),
        headerClassName: 'text-center',
        cell: ({ row }) => (
          <div className="flex items-center justify-center h-full">
            <span className="text-slate-600 dark:text-slate-400">
              {row.original.reorderPoint ?? 0}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'unitCost',
        header: t('products.table.price'),
        headerClassName: 'text-center',
        cell: ({ row }) => (
          <div className="flex items-center justify-center h-full">
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {row.original.unitCost ? `₽${row.original.unitCost.toFixed(2)}` : '—'}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'purchasePrice',
        header: t('products.table.purchasePrice'),
        headerClassName: 'text-center',
        cell: ({ row }) => (
          <div className="flex items-center justify-center h-full">
            <span className="text-slate-600 dark:text-slate-400">
              {row.original.purchasePrice ? `¥${row.original.purchasePrice.toFixed(2)}` : '—'}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'processingPrice',
        header: t('products.table.processingPrice'),
        headerClassName: 'text-center',
        cell: ({ row }) => (
          <div className="flex items-center justify-center h-full">
            <span className="text-slate-600 dark:text-slate-400">
              {row.original.processingPrice ? `₽${row.original.processingPrice.toFixed(2)}` : '—'}
            </span>
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        sortable: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`${createPageUrl('Stock')}?product=${row.original.productId}`}>
                  <Eye className="w-4 h-4 mr-2" />
                  {t('products.table.stock')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEditProduct(row.original)}>
                <Pencil className="w-4 h-4 mr-2" />
                {t('common.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onRequestDelete(row.original)}
                className="text-red-600"
              >
                <Package className="w-4 h-4 mr-2" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ];
  }, [t, imageIndices, onChangeImageIndex, onOpenImageViewer, onEditProduct, onRequestDelete]);

  return (
    <DataTable
      columns={columns}
      data={products}
      searchPlaceholder={t('products.searchPlaceholder')}
      emptyMessage={t('products.emptyMessage')}
      isLoading={isLoading}
    />
  );
}

export default ProductsTable;

