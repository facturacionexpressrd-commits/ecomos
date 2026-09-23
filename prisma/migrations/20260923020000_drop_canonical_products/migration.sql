-- The old global (not store- or workspace-scoped) supplier catalog, replaced by the store-scoped
-- SupplierConnection / SupplierLink tables. Its models were removed from the schema earlier;
-- this drops the tables. Dependents first.
DROP TABLE "OrderRoute";
DROP TABLE "SupplierOffer";
DROP TABLE "ProductMapping";
DROP TABLE "CanonicalProduct";
