import { productPage } from './products.js?v=20260912-mobile';

export async function renderGaming(root) {
  await productPage(root, 'gaming');
}
