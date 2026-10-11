import React, { useState, useRef } from 'react';
import { useEditorStore } from '../store/editorContext.jsx';
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  FileCheck,
  Plus,
  Info,
} from 'lucide-react';

export default function AssetsPanel() {
  const {
    project,
    selectedNode,
    uploadAsset,
    deleteAsset,
    updateAssetMeta,
    getAssetBlobUrl,
    updateProps,
  } = useEditorStore();

  const fileInputRef = useRef(null);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [editFilename, setEditFilename] = useState('');
  const [editAltText, setEditAltText] = useState('');
  const [assetToDelete, setAssetToDelete] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const assets = project?.assets || [];

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const res = await uploadAsset(file);
    if (!res.ok) {
      setUploadError(res.error);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStartEdit = (asset) => {
    setEditingAssetId(asset.id);
    setEditFilename(asset.filename || '');
    setEditAltText(asset.altText || '');
  };

  const handleSaveEdit = (assetId) => {
    updateAssetMeta(assetId, {
      filename: editFilename.trim() || 'asset',
      altText: editAltText,
    });
    setEditingAssetId(null);
  };

  const handleSelectForNode = (asset) => {
    if (selectedNode && selectedNode.type === 'Image') {
      updateProps(selectedNode.id, {
        assetId: asset.id,
        alt: asset.altText || selectedNode.props?.alt || '',
      });
    }
  };

  // Find if an asset is in use
  const getAssetUsageCount = (assetId) => {
    let count = 0;
    const scan = (node) => {
      if (!node) return;
      if (node.type === 'Image' && node.props?.assetId === assetId) count++;
      if (Array.isArray(node.children)) {
        for (const child of node.children) scan(child);
      }
    };
    for (const page of project?.pages || []) {
      if (page.root) scan(page.root);
    }
    return count;
  };

  const totalBytes = assets.reduce((sum, a) => sum + (a.size || 0), 0);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-xs text-zinc-300">
      {/* Action Header */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-[#111114]">
        <div className="flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-semibold text-zinc-200">
            Assets ({assets.length})
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            &bull; {totalMb} MB
          </span>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="p-2.5 m-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[11px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Upload Rejected</span>
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Selection prompt */}
      {selectedNode?.type === 'Image' && (
        <div className="p-2 bg-indigo-950/40 border-b border-indigo-500/20 text-indigo-300 text-[11px] flex items-center gap-2">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Click any asset thumbnail to assign to the selected Image.</span>
        </div>
      )}

      {/* Asset Grid */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {assets.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 space-y-2">
            <ImageIcon className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs">No assets stored yet.</p>
            <p className="text-[11px] text-zinc-600">
              Upload PNG, JPEG, WebP, or GIF images (up to 5 MB per asset).
            </p>
          </div>
        ) : (
          assets.map((asset) => {
            const blobUrl = getAssetBlobUrl(asset.id);
            const usageCount = getAssetUsageCount(asset.id);
            const isEditing = editingAssetId === asset.id;

            return (
              <div
                key={asset.id}
                className="p-2.5 rounded-xl bg-[#141418] border border-white/5 hover:border-white/10 transition-all space-y-2"
              >
                <div className="flex items-center gap-2.5">
                  {/* Thumbnail */}
                  <div
                    onClick={() => handleSelectForNode(asset)}
                    title={
                      selectedNode?.type === 'Image'
                        ? 'Click to apply to selected Image'
                        : asset.filename
                    }
                    className={`w-14 h-14 rounded-lg bg-black/60 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 ${
                      selectedNode?.type === 'Image' ? 'ring-2 ring-indigo-500/50' : ''
                    }`}
                  >
                    {blobUrl ? (
                      <img
                        src={blobUrl}
                        alt={asset.altText || asset.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-zinc-600 animate-pulse" />
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-xs text-white truncate block">
                      {asset.filename}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                      <span>{(asset.size / 1024).toFixed(0)} KB</span>
                      <span>&bull;</span>
                      <span className="uppercase">{asset.mimeType.split('/')[1]}</span>
                      {usageCount > 0 && (
                        <>
                          <span>&bull;</span>
                          <span className="text-emerald-400 font-bold">
                            {usageCount} in use
                          </span>
                        </>
                      )}
                    </div>
                    {asset.altText && (
                      <p className="text-[10px] text-zinc-400 italic truncate mt-0.5">
                        alt: "{asset.altText}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Edit Filename & Alt Text"
                      onClick={() => handleStartEdit(asset)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      title="Delete Asset"
                      onClick={() => setAssetToDelete(asset)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Inline Edit Form */}
                {isEditing && (
                  <div className="pt-2 border-t border-white/5 space-y-1.5">
                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase font-mono">Filename</label>
                      <input
                        type="text"
                        value={editFilename}
                        onChange={(e) => setEditFilename(e.target.value)}
                        className="w-full px-2 py-1 rounded bg-black/50 border border-white/10 text-white text-xs font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase font-mono">Alt Text</label>
                      <input
                        type="text"
                        placeholder="Descriptive text for accessibility"
                        value={editAltText}
                        onChange={(e) => setEditAltText(e.target.value)}
                        className="w-full px-2 py-1 rounded bg-black/50 border border-white/10 text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingAssetId(null)}
                        className="px-2 py-0.5 rounded text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(asset.id)}
                        className="px-2.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl bg-[#141418] border border-rose-500/30 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">Delete Asset?</h3>
            </div>

            <p className="text-xs text-zinc-300">
              Permanently remove "{assetToDelete.filename}" from project storage?
            </p>

            {getAssetUsageCount(assetToDelete.id) > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs space-y-1">
                <span className="font-semibold block">In Use Warning</span>
                <span>
                  This asset is currently referenced by {getAssetUsageCount(assetToDelete.id)}{' '}
                  Image element(s). Deleting it will cause them to render placeholder fallbacks.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssetToDelete(null)}
                className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteAsset(assetToDelete.id);
                  setAssetToDelete(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
