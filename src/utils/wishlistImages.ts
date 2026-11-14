import keretaImg from '../assets/images/wishlist_kereta_car_1794632634102.jpg';
import daruratImg from '../assets/images/wishlist_dana_darurat_1794632640698.jpg';
import macbookImg from '../assets/images/wishlist_macbook_desk_1794632634633.jpg';

export const DEFAULT_WISHLIST_IMAGES: Record<string, string> = {
  'wish-kereta': keretaImg,
  'wish-darurat': daruratImg,
  'wish-workstation': macbookImg,
};

export function resolveWishlistImage(itemId: string, imageUrl?: string): string | undefined {
  if (imageUrl && imageUrl.trim().length > 0) {
    return imageUrl;
  }
  return DEFAULT_WISHLIST_IMAGES[itemId];
}
