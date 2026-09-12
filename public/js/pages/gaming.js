import { productPage } from './products.js?v=20260912-i18n';

export async function renderGaming(root) {
  await productPage(root, 'gaming');
}
