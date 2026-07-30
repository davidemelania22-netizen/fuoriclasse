import { useId } from 'react';

interface ProfileImageProps {
  /** Uploaded image data URL, or null/undefined for the empty placeholder. */
  src?: string | null | undefined;
  size?: number | undefined;
  /** When provided, the image is clickable and opens a file picker. */
  onPick?: ((file: File) => void) | undefined;
  uploading?: boolean | undefined;
  title?: string | undefined;
}

function Placeholder() {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
      <circle cx="50" cy="50" r="50" fill="var(--surface-3)" />
      <circle cx="50" cy="40" r="16" fill="var(--faint)" />
      <path
        d="M22 84 C22 64 36 56 50 56 C64 56 78 64 78 84 Z"
        fill="var(--faint)"
      />
    </svg>
  );
}

/** Empty-by-default profile picture that the user can upload manually. */
export function ProfileImage({
  src,
  size = 84,
  onPick,
  uploading,
  title,
}: ProfileImageProps) {
  const inputId = useId();

  const inner = src ? (
    <img
      src={src}
      alt={title ?? 'Foto profilo'}
      className="profile-img-photo"
    />
  ) : (
    <Placeholder />
  );

  if (!onPick) {
    return (
      <span
        className="profile-img"
        style={{ width: size, height: size }}
        title={title}
      >
        {inner}
      </span>
    );
  }

  return (
    <label
      className="profile-img profile-img-editable"
      style={{ width: size, height: size }}
      htmlFor={inputId}
      title="Carica foto profilo"
    >
      {inner}
      <span className="profile-img-overlay">{uploading ? '…' : '📷'}</span>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = '';
        }}
      />
    </label>
  );
}
