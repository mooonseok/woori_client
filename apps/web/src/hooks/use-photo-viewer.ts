'use client';
import { useEffect, useState } from 'react';
import type { Point } from '@/dto/album.dto';
import type { PhotoViewerModel } from '@/dto/viewer-ui.dto';
import type { PhotoViewerProps } from '@/dto/viewer.dto';
export function usePhotoViewer(props: PhotoViewerProps): PhotoViewerModel {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null),
    [imageRetry, setImageRetry] = useState(0);
  const retryImage = () => {
    setFailedPhoto(null);
    setImageRetry((value) => value + 1);
  };
  const [photoId, setPhotoId] = useState(props.initialPhotoId);
  const [chrome, setChrome] = useState(true),
    [panel, setPanel] = useState(false),
    [more, setMore] = useState(false),
    [reacting, setReacting] = useState(false);
  const [mode, setMode] = useState<'browse' | 'place' | 'write'>('browse');
  const [point, setPoint] = useState<Point | undefined>(),
    [pinText, setPinText] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [selectedPin, setSelectedPin] = useState<string | null>(null),
    [pins, setPins] = useState(true);
  const [confirm, setConfirm] = useState<'close' | 'pin' | null>(null);
  const [guide, setGuide] = useState<'view' | 'pin' | null>(null),
    [afterGuide, setAfterGuide] = useState(false);
  const index = Math.max(
      0,
      props.photos.findIndex((photo) => photo.id === photoId)
    ),
    photo = props.photos[index];
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem('woori.guide.view') === '1';
    } catch {
      /* Private browsing can disable storage. */
    }
    if (seen) return;
    const timer = setTimeout(() => setGuide('view'), 340);
    return () => clearTimeout(timer);
  }, []);
  const beginPin = () => {
    setMode('place');
    setPoint(undefined);
    setSelectedPin(null);
    setPins(true);
    setChrome(true);
    setPanel(false);
    setMore(false);
    setReacting(false);
  };
  const startPin = () => {
    let seen = false;
    try {
      seen = localStorage.getItem('woori.guide.pin') === '1';
    } catch {
      /* The guide remains usable without persistence. */
    }
    if (!seen) {
      setAfterGuide(true);
      setGuide('pin');
    } else beginPin();
  };
  const finishGuide = () => {
    if (guide)
      try {
        localStorage.setItem(`woori.guide.${guide}`, '1');
      } catch {
        /* Optional preference only. */
      }
    const place = guide === 'pin' && afterGuide;
    setGuide(null);
    setAfterGuide(false);
    if (place) beginPin();
  };
  const openGuide = (kind: 'view' | 'pin') => {
    setMore(false);
    setAfterGuide(false);
    setGuide(kind);
  };
  const draftCount =
    Object.values(drafts).filter((text) => text.trim()).length +
    (pinText.trim() ? 1 : 0);
  const requestClose = () => {
    if (draftCount) setConfirm('close');
    else props.onClose();
  };
  const cancelPin = () => {
    if (pinText.trim()) {
      setConfirm('pin');
      return;
    }
    setMode('browse');
    setPoint(undefined);
  };
  const discard = () => {
    const closing = confirm === 'close';
    setConfirm(null);
    setPinText('');
    setPoint(undefined);
    setMode('browse');
    if (closing) {
      setDrafts({});
      props.onClose();
    }
  };
  const navigate = (direction: -1 | 1) => {
    const next = props.photos[index + direction];
    if (!next) return;
    setPhotoId(next.id);
    setSelectedPin(null);
    setReacting(false);
    setPoint(undefined);
  };
  const tap = (selected: Point | null) => {
    if (mode === 'place') {
      if (selected) {
        setPoint(selected);
        setMode('write');
      }
      return;
    }
    if (mode !== 'browse') return;
    if (reacting) setReacting(false);
    else if (selectedPin) setSelectedPin(null);
    else if (panel) setPanel(false);
    else setChrome((value) => !value);
  };
  const submitComment = () => {
    if (!photo || !drafts[photo.id]?.trim()) return;
    props.onAddComment(photo.id, drafts[photo.id].trim());
    setDrafts((current) => ({ ...current, [photo.id]: '' }));
  };
  const submitPin = () => {
    if (!photo || !point || !pinText.trim()) return;
    props.onAddComment(photo.id, pinText.trim(), point);
    setPinText('');
    setPoint(undefined);
    setMode('browse');
    setPanel(true);
  };
  return {
    failedPhoto,
    setFailedPhoto,
    imageRetry,
    retryImage,
    photo,
    index,
    chrome,
    panel,
    setPanel,
    more,
    setMore,
    reacting,
    setReacting,
    mode,
    point,
    pinText,
    setPinText,
    drafts,
    setDrafts,
    draftCount,
    selectedPin,
    setSelectedPin,
    pins,
    setPins,
    confirm,
    setConfirm,
    guide,
    finishGuide,
    openGuide,
    startPin,
    cancelPin,
    requestClose,
    discard,
    navigate,
    tap,
    submitComment,
    submitPin,
  };
}
