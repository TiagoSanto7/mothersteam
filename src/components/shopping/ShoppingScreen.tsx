const STATIC_PRODUCTS = [
  { id: '1', emoji: '🧴', name: 'Creme Hidratante Baby', price: 'R$ 29,90', category: 'Cuidados' },
  { id: '2', emoji: '🛁', name: 'Sabonete Líquido',      price: 'R$ 19,90', category: 'Higiene' },
  { id: '3', emoji: '💊', name: 'Vitamina D Gotas',      price: 'R$ 34,90', category: 'Saúde' },
  { id: '4', emoji: '🩺', name: 'Termômetro Digital',    price: 'R$ 49,90', category: 'Saúde' },
  { id: '5', emoji: '🍼', name: 'Mamadeira Anti-cólica', price: 'R$ 59,90', category: 'Alimentação' },
  { id: '6', emoji: '🧸', name: 'Pelúcia Musical',       price: 'R$ 89,90', category: 'Entretenimento' },
] as const;

export function ShoppingScreen() {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="px-4 pt-4">
        <h1 className="text-base font-semibold text-graphite">Baby Team Store</h1>
        <p className="text-xs text-graphite-muted">Produtos selecionados para você e seu bebê</p>
      </div>

      <div className="mx-4 rounded-3xl bg-gradient-to-br from-lavender-400 to-lavender-600 p-5 text-white">
        <p className="text-xs font-medium opacity-80 mb-1">Em breve</p>
        <p className="text-base font-bold leading-snug">
          Seus produtos Baby Team a um clique
        </p>
        <p className="text-xs opacity-75 mt-1">Loja completa disponível na Fase 2</p>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4">
        {STATIC_PRODUCTS.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-2"
          >
            <div className="w-12 h-12 rounded-2xl bg-lavender-50 flex items-center justify-center text-2xl">
              {product.emoji}
            </div>
            <div>
              <p className="text-xs text-graphite-muted">{product.category}</p>
              <p className="text-sm font-medium text-graphite leading-tight">{product.name}</p>
            </div>
            <p className="text-sm font-bold text-lavender-600">{product.price}</p>
            <button
              disabled
              aria-label={`${product.name} — disponível em breve`}
              className="w-full py-2 rounded-xl bg-gray-100 text-graphite-muted text-xs font-medium cursor-not-allowed"
            >
              Em breve
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
