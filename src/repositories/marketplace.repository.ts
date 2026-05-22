import { marketplaceApi, CheckoutPayload } from '../api/marketplace.api';

export const marketplaceRepository = {
  async getProducts() {
    return marketplaceApi.getProducts();
  },
  async checkout(payload: CheckoutPayload) {
    return marketplaceApi.processMarketplaceCheckout(payload);
  }
};
