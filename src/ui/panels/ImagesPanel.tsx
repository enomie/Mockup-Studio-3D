import { Plus } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import { orientationLabel } from '@/data/image-assets';
import { Icon } from '@/ui/components/Icon';
import { SubPanel } from '@/ui/components/SubPanel';
import { addImagesFromFiles } from '@/ui/store/app-store';
import { useAppStore } from '@/ui/store/use-app-store';

export function ImagesPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const images = useAppStore((s) => s.images);

  const handleAddClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const files = event.target.files;
    if (!files?.length) return;
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
            className="image-add-btn"
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
        {images.map((image) => (
          <li key={image.id}>
            <button
              type="button"
              className="image-tile"
              aria-label={image.name}
              title={image.name}
            >
              <span className="image-tile__thumb">
                <img src={image.url} alt="" loading="lazy" />
              </span>
              <span className="image-tile__meta">
                <span className="image-tile__name">{image.name}</span>
                <span className="image-tile__orientation">
                  {orientationLabel(image.orientation)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </SubPanel>
  );
}
