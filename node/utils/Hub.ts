/* eslint-disable @typescript-eslint/no-explicit-any */
import { ExternalClient, InstanceOptions, IOContext, Logger } from '@vtex/api'

const BASE_PATH =
  'http://logistics.vtexcommercestable.com.br/api/logistics/pvt/configuration/pickuppoints/'

const routes = {
  getAll: (
    { keyword, latitude, longitude, page = 1 }: any,
    account: string
  ) => {
    let path = `_search?an=${account}`

    if (keyword) {
      path += `&keyword=${keyword}`
    } else if (latitude && longitude) {
      path = `_searchsellers?an=${account}&lat=${Number(latitude).toFixed(
        2
      )}&lon=${Number(longitude).toFixed(2)}&maxDistance=200`
    }

    path += `&pageSize=100&page=${page}`

    return `${BASE_PATH}${path}`
  },
}

export default class RequestHub extends ExternalClient {
  public logger: Logger
  constructor(context: IOContext, options?: InstanceOptions) {
    super('', context, {
      ...options,
      headers: {
        Accept: 'application/json',
        // 'Proxy-Authorization': context.authToken,
        'Content-type': 'application/json',
        Authorization: context.authToken,
        VtexIdclientAutCookie: context.adminUserAuthToken ?? context.authToken ?? '',
      },
    })
    this.logger = new Logger(context)
  }

  public getStores(data: any) {
    return this.http
      .getRaw(routes.getAll(data, this.context.account))
      .catch((e) => {
        this.logger.error(e)
      })
  }
}
