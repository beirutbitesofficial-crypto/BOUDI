import { productPage } from './products.js';

export async function renderGaming(root) {
  await productPage(root, 'gaming');
}
