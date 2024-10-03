import React, { useState, useEffect, useCallback } from 'react'
import { injectIntl, FormattedMessage } from 'react-intl'
import { graphql, useLazyQuery, useQuery } from 'react-apollo'
import { flowRight as compose } from 'lodash'
import { Spinner } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'

import ORDER_FORM from './queries/orderForm.gql'
import GET_STORES from './queries/getStores.gql'
import GOOGLE_KEYS from './queries/GetGoogleMapsKey.graphql'
import STORES_SETTINGS from './queries/storesSettings.graphql'
import Listing from './components/Listing'
import Pinpoints from './components/Pinpoints'
import Filter from './components/Filter'
import EmptyList from './components/EmptyList'
import { filterStoresByProvinceAndName, getStoresFilter, saveStoresFilter } from './utils'

const CSS_HANDLES = [
  'listContainer',
  'listContainerCol',
  'storesListCol',
  'storesList',
  'storesMapCol',
  'noResults',
  'listingMapContainer',
  'loadAll',
  'loadingContainer',
] as const

interface StoreListProps {
  orderForm: {
    called: boolean
    loading: boolean
    orderForm: any
  }
  googleMapsKeys: any
  filterByTag: string
  icon: string
  iconWidth: number
  iconHeight: number
  zoom: number
  lat: number
  long: number
  sortBy?: 'distance' | string
}

const StoreList: React.FC<StoreListProps> = ({
  orderForm: {  orderForm: ofData },
  googleMapsKeys,
  filterByTag,
  icon,
  iconWidth,
  iconHeight,
  zoom,
  lat,
  long,
  sortBy = 'distance',
}) => {
  const { data: storesSettings } = useQuery(STORES_SETTINGS, { ssr: false })
  const [getStores, { data, loading, called, error }] = useLazyQuery(GET_STORES, {
    fetchPolicy: 'cache-first',
  })

  const [stores, setStores] = useState([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [storesFiltered, setStoresFiltered] = useState<any[]>([])
  const [storesFilter, setStoresFilter] = useState(getStoresFilter())
  const [state, setState] = useState<{
    strikes: number
    allLoaded: boolean
    center: any
    zoom: number
  }>({
    strikes: 0,
    allLoaded: false,
    center: null,
    zoom: zoom || 8,
  })

  const handles = useCssHandles(CSS_HANDLES)

  const loadAll = useCallback(() => {
    setState(prev => ({ ...prev, allLoaded: true }))
    getStores()
  }, [getStores, lat, long, filterByTag])

  useEffect(() => {
    if (state.strikes < 4) loadAll()
  }, [state.strikes, loadAll])

  useEffect(() => {
    loadAll()
  }, [storesFilter.store, loadAll])

  useEffect(() => {
    if (stores) {
      setIsLoading(true)
      const filteredStores = filterStoresByProvinceAndName(storesFilter.province, storesFilter.store, stores)
      setStoresFiltered(filteredStores)
    } else if (!loading && called && error && !state.allLoaded) {
      setState(prev => ({
        ...prev,
        strikes: prev.strikes < 4 ? prev.strikes + 1 : prev.strikes,
      }))
    } else {
      setStoresFiltered(stores)
    }
    setIsLoading(false)
  }, [storesFilter.province, storesFilter.store, filterByTag, stores])

  useEffect(() => {
    if (!called || !data) return

    const sortedStores = data?.getStores?.items.sort((a, b) => a[sortBy] - b[sortBy]) || []
    setStores(sortedStores)
  }, [data, called, sortBy])

  useEffect(() => {
    if (storesFiltered?.[0]?.address?.location) {
      const location = storesFiltered[0].address.location as { longitude: number; latitude: number }
      setState(prev => ({ ...prev, center: [location.longitude, location.latitude], zoom: 9 }))
    }
  }, [storesFiltered])

  const handleCenter = useCallback(({center, zoom}:{center: number[], zoom?: number}) => {
    setState(prev => ({ ...prev, center, zoom: zoom ?? prev.zoom }))
  }, [])

  const handleResetFilters = useCallback(() => {
    saveStoresFilter('province', '')
    saveStoresFilter('store', '')
    setStoresFilter(getStoresFilter())
  }, [])

  const storesSettingsParsed = storesSettings ? JSON.parse(storesSettings.appSettings.message) : { stores: [] }

  if (!loading && data?.getStores.items.length === 0 && state.strikes < 4) {
    setState(prev => ({ ...prev, strikes: prev.strikes + 1 }))
  }

  if (!state.center && data?.getStores?.items.length) {
    const [firstResult] = data.getStores.items
    const { latitude, longitude } = firstResult.address.location
    const center = ofData?.shippingData?.address?.geoCoordinates ?? [longitude || long, latitude || lat]
    handleCenter({center})
  }

  return (
    <div className={`flex flex-row ${handles.listContainer}`}>
      <div className={`flex-col w-100 ${handles.listContainerCol}`}>
        <Filter
          storesFilter={storesFilter}
          setStoresFilter={setStoresFilter}
          storesSettings={storesSettingsParsed.stores}
        />
        {loading || isLoading && (
          <div className={handles.loadingContainer}>
            <Spinner />
          </div>
        )}
        {!loading && !isLoading && data && googleMapsKeys?.logistics?.googleMapsKey && (
          <div className={handles.storesMapCol}>
            <Pinpoints
              apiKey={googleMapsKeys.logistics.googleMapsKey}
              className={handles.listingMapContainer}
              items={storesFiltered}
              zoom={state.zoom}
              center={state.center}
              icon={icon}
              iconWidth={iconWidth}
              iconHeight={iconHeight}
            />
          </div>
        )}
        {!loading && data && storesFiltered.length === 0 && (
          <EmptyList
            resetLink={() => {
              handleResetFilters()
            }}
          />
        )}
        {!loading && data && storesFiltered.length > 0 && (
          <div className={handles.storesListCol}>
            <div className={`overflow-auto h-100 ${handles.storesList}`}>
              <Listing items={storesFiltered} onChangeCenter={handleCenter} />
              {state.allLoaded && (
                <span
                  className={`mt2 link c-link underline-hover pointer ${handles.loadAll}`}
                  onClick={handleResetFilters}
                >
                  <FormattedMessage id="store/load-all" />
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default compose(
  injectIntl,
  graphql(ORDER_FORM, {
    name: 'orderForm',
    options: { ssr: false },
  }),
  graphql(GOOGLE_KEYS, {
    name: 'googleMapsKeys',
    options: { ssr: false },
  })
)(StoreList)