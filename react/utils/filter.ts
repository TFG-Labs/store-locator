const defaultStoresFilter: StoresFilter = {
  province: '',
  store: '',
}

export const filterStoresByProvince = (
  province: string,
  stores: SpecificationGroup[]
): SpecificationGroup[] => {
  if (!province) return stores

  return stores.filter((store) => store.address.state === province)
}

export const filterStoresByName = (
  name: string,
  stores: SpecificationGroup[]
): SpecificationGroup[] => {
  if (!name) return stores

  return stores.filter((store) => store.friendlyName.toLowerCase().includes(name.toLowerCase()))
}

export const filterStoresByProvinceAndName = (province: string, name: string, stores: any[]) => {
  return stores?.filter((store: any) => {
    const matchesProvince = !province || store.address?.state === province

    if (!name) return matchesProvince

    // Existing search methods
    const searchRegex = new RegExp(`^${name.replace(/[-\s]/g, '[-\\s]?')}`, 'i')
    const searchTerms = name.split(/\s+/)

    // New: Calculate word match percentage
    const storeWords = store.name.toLowerCase().split(/\s+/)
    const matchedWords = searchTerms.filter(term => 
      storeWords.some(word => word.includes(term.toLowerCase()))
    )
    const wordMatchPercentage = (matchedWords.length / searchTerms.length) * 100
    const matchesName = 
      searchRegex.test(store.name) || 
      wordMatchPercentage >= 50 && searchTerms.length > 2  // Consider a match if 50% or more words match

    return matchesProvince && matchesName
  })
}

export const saveStoresFilter = (key: string, value: string) => {
  const filterLocalStorage = window.localStorage?.getItem('storesFilter')
  const storesFilter: StoresFilter = filterLocalStorage
    ? JSON.parse(filterLocalStorage)
    : defaultStoresFilter

  storesFilter[key] = value
  window.localStorage?.setItem('storesFilter', JSON.stringify(storesFilter))
}

export const getStoresFilter = (): StoresFilter => {
  const storesLocalStorage = window.localStorage?.getItem('storesFilter')

  const storesFilter = storesLocalStorage
    ? JSON.parse(storesLocalStorage)
    : defaultStoresFilter

  return storesFilter
}
