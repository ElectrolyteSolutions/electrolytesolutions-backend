// Example helper to sync an item from your ERP payload into MongoDB
const syncErpProductToMongo = async (erpItem) => {
  try {
    const updateData = {
      erpProductId: erpItem.id,
      title: erpItem.name,
      slug: erpItem.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description: erpItem.description,
      variants: erpItem.variants.map(v => ({
        erpVariantId: v.variantId,
        sku: v.sku,
        price: v.price,
        compareAtPrice: v.comparePrice,
        inventoryQuantity: v.stockQty,
      })),
      images: erpItem.imageUrls || [],
      seo: {
        metaTitle: erpItem.name,
        metaDescription: erpItem.shortDescription || erpItem.description?.substring(0, 150)
      }
    };

    await Product.findOneAndUpdate(
      { erpProductId: erpItem.id },
      updateData,
      { upsert: true, new: true }
    );
    console.log(`Synced ERP Product: ${erpItem.name}`);
  } catch (err) {
    console.error(`Failed to sync ERP product ${erpItem.id}:`, err.message);
  }
};