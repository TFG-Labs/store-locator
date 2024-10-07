/* eslint-disable vtex/prefer-early-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { method } from '@vtex/api'
import slugify from 'slugify'

import { getStoreBindings } from '../utils/Binding'

const Slugify = (str: string) => {
  return slugify(str, { lower: true, remove: /[*+~.()'"!:@]/g })
}

export const resolvers = {
  Routes: {
    getSitemap: [
      method({
        GET: async (ctx: Context) => {
          const {
            clients: { tenant },
          } = ctx

          try {
            const stores: any = await resolvers.Query.getStores(
              null,
              {
                keyword: null,
                latitude: null,
                longitude: null,
              },
              ctx
            )

            const [storeBindings] = await getStoreBindings(tenant)

            const { canonicalBaseAddress } = storeBindings
            const baseUrl =
              canonicalBaseAddress.indexOf('myvtex') === -1
                ? String(canonicalBaseAddress)
                : String(ctx.vtex.host)

            const stripTrailingSlash = (str: string) => {
              return str.endsWith('/') ? str.slice(0, -1) : str
            }

            const lastMod = new Date().toISOString()
            const storesMap = `
              <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
                ${stores?.items
                  .filter((item: any) => {
                    return !!item.isActive
                  })
                  .map((item: any) => {
                    return `<url>
                  <loc>https://${stripTrailingSlash(baseUrl)}/store/${Slugify(
                      `${item.name} ${item.address.state} ${item.address.postalCode}`
                    )}/${String(item.id).replace('1_', '')}</loc>
                  <lastmod>${lastMod}</lastmod>
                  <changefreq>daily</changefreq>
                  <priority>0.8</priority>
               </url>`
                  })
                  .join('')}
              </urlset>`

            ctx.set('Content-Type', 'text/xml')
            ctx.body = storesMap
            ctx.status = 200
          } catch (e) {
            ctx.body = e
            ctx.status = 500
          }
        },
      }),
    ],
  },
  Query: {
    getStores: async (_: any, param: any, ctx: any) => {
      const {
        clients: { hub, sitemap, vbase },
        vtex: { logger },
      } = ctx

      const APP_NAME = 'store-locator'
      const SHCEMA_NAME = 'sitemap'

      const saveInVbase = async () => {
        try {
          const res = await sitemap.saveIndex()

          if (res.data.saveIndex) {
            await vbase.saveJSON(APP_NAME, SHCEMA_NAME, {
              alreadyHasSitemap: true,
            })

            return true
          }

          return false
        } catch (err) {
          logger.log({ error: err, message: 'getStores-saveInBase-error' })

          return false
        }
      }

      sitemap.hasSitemap().then((has: any) => {
        if (has === false) {
          vbase
            .getJSON(APP_NAME, SHCEMA_NAME, true)
            .then((getResponse: any) => {
              const { alreadyHasSitemap } = getResponse

              !alreadyHasSitemap && saveInVbase()
            })
            .catch((err: any) =>
              logger.log({ error: err, message: 'getStores-getJSON-error' })
            )
        }
      })

      let result = await hub.getStores(param)

      if (!result?.data.length && !param.keyword) {
        result = await hub.getStores({})
      }

      const paging = result?.data?.paging ?? {}
      const items = result?.data?.items ?? []

      const pickuppoints = { items }

      if (paging?.pages > 1) {
        let i = 2
        const results = [] as any

        while (i <= paging.pages) {
          results.push(hub.getStores({ ...param, page: i }))
          i++
        }

        const remainingData = await Promise.all(results)

        remainingData.forEach((newResult: any) => {
          pickuppoints?.items.push(...newResult.data.items)
        })
      }

      return {
        items: Array.isArray(pickuppoints?.items)
          ? pickuppoints.items
              .map((item: any) => ({
                ...item,
                address: {
                  ...item.address,
                  country: item.address?.acronym,
                },
              }))
              .filter((item: any) => item.isActive)
          : [],
      }
    },
  },
}
