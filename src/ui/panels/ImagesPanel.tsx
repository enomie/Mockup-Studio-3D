import { Plus, Trash2 } from 'lucide-react';
import { noop } from '@/utils/noop';
import { useRef, type ChangeEvent } from 'react';
import { orientationLabel, type ImageAsset } from '@/data/image-assets';
import { Icon } from '@/ui/components/Icon';
import { PanelTextField } from '@/ui/components/PanelTextField';
import { SubPanel } from '@/ui/components/SubPanel';
import { SubPanelSection } from '@/ui/components/SubPanelSection';
import {
  addImagesFromFiles,
  removeImage,
  selectImage,
} from '@/ui/store/app-store';
import { sortByDisplayName } from '@/ui/utils/library-list-order';
import { useAppStore } from '@/ui/store/use-app-store';

interface ImageEditorProps {
  image: ImageAsset;
}

function ImageEditor({ image }: ImageEditorProps) {
  const isUser = image.source === 'user';

  return (
    <SubPanelSection title="Editor">
      <PanelTextField
        id="image-name"
        label="Name"
        value={image.name}
        disabled
        onChange={noop}
      />

      {isUser ? (
        <div className="material-editor-actions">
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => { removeImage(image.id); }}
          >
            <Icon icon={Trash2} size={16} strokeWidth={1.75} />
            Remove
          </button>
        </div>
      ) : null}
    </SubPanelSection>
  );
}

export function ImagesPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const images = useAppStore((s) => s.images);
  const sortedImages = sortByDisplayName(images, (image) => image.name);
  const selectedImageId = useAppStore((s) => s.selectedImageId);
  const selected = images.find((image) => image.id === selectedImageId);

  const handleAddClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const files = event.target.files;
    if (!files?.length) {return;}
    await addImagesFromFiles(files);
    event.target.value = '';
  };

  return (
    <SubPanel
      title="Images"
      side="left"
      footer={
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif"
            multiple
            hidden
            onChange={(event) => void handleFilesSelected(event)}
          />
          <button
            type="button"
            className="btn btn--add"
            aria-label="Add images"
            onClick={handleAddClick}
          >
            <Icon icon={Plus} />
            Add image
          </button>
        </>
      }
    >
      <ul className="image-list">
        {sortedImages.map((image) => (
          <li key={image.id}>
            <button
              type="button"
              className={`image-tile${selectedImageId === image.id ? ' image-tile--selected' : ''}`}
              aria-label={image.name}
              title={image.name}
              onClick={() => { selectImage(image.id); }}
            >
              <span className="image-tile__thumb">
                <img src={image.url} alt="" loading="lazy" />
              </span>
              <span className="image-tile__meta">
                <span className="image-tile__name">{image.name}</span>
                <span className="image-tile__orientation">
                  {image.source === 'starter' ? (
                    <>
                      <span className="material-tile__kind">Starter</span>
                      {image.logicalFormat && image.sizeToken ? (
                        <span
                          className="image-tile__builtin-detail"
                          title={`${image.logicalFormat} · ${image.sizeToken}`}
                        >
                          {image.logicalFormat} · {image.sizeToken}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    orientationLabel(image.orientation)
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected ? <ImageEditor image={selected} /> : null}
    </SubPanel>
  );
}
