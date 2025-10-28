export interface ProductData {
  vendorId: string;
  brandId?: string;
  categoryId: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description: string;
  originalPrice: string;
  discount?: string;
  images?: string[];
  tags?: string[];
  isActive?: boolean;
}
