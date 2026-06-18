import {AxiosResponse, isAxiosError} from "axios";
import {BaseAPI} from "../../api/base.ts";
import {Configuration} from "../../api";

type ApiCtor<API extends BaseAPI> = new (config: Configuration) => API;
type ApiExecute<API extends BaseAPI, T> = (api: API) => Promise<AxiosResponse<T>>;

const createApiConfiguration = (): Configuration => {
    const token = localStorage.getItem("dddToken");
    return new Configuration({
        basePath: "",
        baseOptions: {
            headers: token ? {"Authorization": `Bearer ${token}`} : {},
        },
    });
};

export async function apiExec<API extends BaseAPI, T>(
    ApiClass: ApiCtor<API>,
    executeRequest: ApiExecute<API, T>
): Promise<T> {
    try {
        const config = createApiConfiguration();
        const response = await executeRequest(new ApiClass(config));
        return response.data;
    } catch (error) {
        if (isAxiosError(error)) {
            if (error.response?.status) {
                throw new Error(`Request failed with status ${error.response.status}`);
            }
            throw new Error(error.message);
        }
        throw new Error(`${error}`);
    }
}
