import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import styled from "@emotion/styled";
import CodeMirror from "@uiw/react-codemirror";
import { useRequest } from "ahooks";
import {
  Badge,
  Breadcrumb,
  Button,
  Divider,
  // Dropdown,
  Empty,
  Input,
  message,
  Select,
  Spin,
  Tabs,
  Tag,
  Typography,
} from "antd";
import axios from "axios";
import { FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useImmer } from "use-immer";
import { v4 as uuidv4 } from "uuid";

import { FileSystemService } from "../../api/FileSystem.service";
import { METHODS } from "../../constant";
import { useStore } from "../../store";
import { tryParseJsonString, tryPrettierJsonString } from "../../utils";
import AnimateAutoHeight from "../AnimateAutoHeight";
import FormHeader, { FormHeaderWrapper } from "./FormHeader";
import FormTable, { getColumns } from "./FormTable";
import Response from "./Response";
import ResponseCompare from "./ResponseCompare";

const { TabPane } = Tabs;

export type HttpProps = {
  mode?: "normal" | "compare";
  id: string;
  path: string[];
};

export type KeyValueType = {
  key: string;
  value: string;
  active: boolean;
};

export type ParamsObject = { [key: string]: string };

const RequestTypeOptions = METHODS.map((method) => ({
  label: method,
  value: method,
}));

const HeaderWrapper = styled.div`
  display: flex;

  .ant-select > .ant-select-selector {
    width: 120px;
    left: 1px;
    border-radius: 2px 0 0 2px;
    .ant-select-selection-item {
      font-weight: 500;
    }
  }
  .ant-input {
    border-radius: 0 2px 2px 0;
  }
  .ant-btn-group,
  .ant-btn {
    margin-left: 16px;
  }
`;

const CountTag = styled(Tag)`
  border-radius: 8px;
  padding: 0 6px;
  margin-left: 4px;
`;

const ResponseWrapper = styled.div`
  height: 600px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Http: FC<HttpProps> = ({ mode = "normal", id, path }) => {
  const theme = useStore((state) => state.theme);
  const { t: t_common } = useTranslation("common");
  const { t: t_components } = useTranslation("components");

  const [method, setMethod] = useState<typeof METHODS[number]>("GET");
  // const [requestSavedName, setRequestSavedName] = useState<string>(
  //   t_components("http.untitledRequest")
  // );

  const [url, setUrl] = useState("");
  const [sent, setSent] = useState(false);
  const [response, setResponse] = useState<any>(); // 响应完整数据
  const [requestParams, setRequestParams] = useImmer<KeyValueType[]>([
    { key: "", value: "", active: true },
  ]);

  useEffect(() => {
    handleUpdateUrl();
  }, [requestParams]);

  const params = useMemo(
    () =>
      requestParams.reduce<ParamsObject>((acc, { key, value, active }) => {
        if (key && active) {
          acc[key] = value;
        }
        return acc;
      }, {}),
    [requestParams]
  );
  const paramsCount = useMemo(
    () =>
      requestParams.reduce((count, param) => {
        param.key && param.active && count++;
        return count;
      }, 0),
    [requestParams]
  );
  const [requestHeaders, setRequestHeaders] = useImmer<KeyValueType[]>([
    {
      key: "",
      value: "",
      active: true,
    },
  ]);
  const headers = useMemo(
    () =>
      requestHeaders.reduce<{
        [key: string]: string | number;
      }>((acc, header) => {
        if (header.key) {
          acc[header.key] = header.value;
        }
        return acc;
      }, {}),
    []
  );
  const headerCount = useMemo(
    () =>
      requestHeaders.reduce((count, header) => {
        header.key && header.active && count++;
        return count;
      }, 0),
    [requestHeaders]
  );

  const [contentType, setContentType] = useState("application/json");
  const [requestBody, setRequestBody] = useState("");

  const {
    data: res,
    loading: requesting,
    run: request,
  } = useRequest(axios, {
    manual: true,
    onSuccess: (res) => {
      setResponse(res);
    },
    onError(err) {
      setResponse(err?.response);
    },
    onFinally: () => {
      setSent(true);
    },
  });

  useRequest(
    () => {
      const { nodeType, key: id } = path[path.length - 1];
      const { key: pid } = path[path.length - 2];
      if (nodeType === 1) {
        return FileSystemService.queryInterface({ id });
      } else if (nodeType === 2) {
        return new Promise((resolve, reject) => {
          FileSystemService.queryInterface({ id: pid }).then((r) => {
            FileSystemService.queryCase({ id }).then((r1) => {
              resolve({
                body: {
                  ...r.body,
                  ...r1.body,
                },
              });
            });
          });
        });
      }
    },
    {
      refreshDeps: [id],
      onSuccess(res) {
        setUrl(res.body.address?.endpoint || "");
        setMethod(res.body.address?.method || "GET");
        setRequestParams(
          res.body.params.map((p) => ({ id: uuidv4(), ...p })) || []
        );
        setRequestHeaders(
          res.body.headers.map((h) => ({ id: uuidv4(), ...h })) || []
        );
        setContentType(res.body.body.contentType);
        setRequestBody(res.body.body.body || "");
      },
    }
  );

  const { run: saveInterface } = useRequest(
    (s) => {
      const { nodeType, key: id } = path[path.length - 1];
      if (nodeType === 1) {
        return FileSystemService.saveInterface(s).then((res: any) =>
          message.success("保存成功")
        );
      } else if (nodeType === 2) {
        return FileSystemService.saveCase(s).then((res: any) =>
          message.success("保存成功")
        );
      }
    },
    {
      manual: true,
      onSuccess(res) {},
    }
  );

  const handlePrettier = () => {
    const prettier = tryPrettierJsonString(
      requestBody,
      t_common("invalidJSON")
    );
    prettier && setRequestBody(prettier);
  };

  const handleRequest = () => {
    if (!url) return message.warn(t_components("http.urlEmpty"));

    const data: Partial<Record<"params" | "data", object>> = {};
    if (method === "GET") {
      data.params = params;
    } else if (requestBody) {
      const body = tryParseJsonString(requestBody, t_common("invalidJSON"));
      body && (data.data = body);
    }

    request(url, {
      method,
      headers,
      ...data,
    });
  };

  const handleSave = () => {
    saveInterface({
      id,
      auth: null,
      body: {
        contentType,
        body: requestBody,
      },
      address: {
        endpoint: url,
        method,
      },
      headers: requestHeaders,
      params: requestParams,
      preRequestScript: null,
      testScript: null,
    });
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, queryStr] = value.split("?");
    if (queryStr) {
      const query = queryStr.split("&").map((q) => {
        const [key, value] = q.split("=");
        return { key, value, active: true };
      });
      setRequestParams(query);
    }
  };

  const handleUpdateUrl = () => {
    const invalidValues = ["", undefined];
    const query = requestParams
      .filter((param) => param.active && !invalidValues.includes(param.key))
      .reduce((pre, cur, i) => {
        pre += `${i === 0 ? "?" : "&"}${cur.key}=${cur.value}`;
        return pre;
      }, "");
    setUrl(url.split("?")[0] + query);
  };

  return (
    <>
      <AnimateAutoHeight>
        <Breadcrumb style={{ paddingBottom: "14px", paddingTop: "14px" }}>
          {path.map((i) => (
            <Breadcrumb.Item>{i.title}</Breadcrumb.Item>
          ))}
        </Breadcrumb>

        <HeaderWrapper>
          <Select
            value={method}
            options={RequestTypeOptions}
            onChange={setMethod}
          />
          <Input
            placeholder={t_components("http.enterRequestUrl")}
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
          />
          {mode === "compare" ? (
            <Input
              placeholder={"Enter compare request URL"}
              style={{ marginLeft: "8px" }}
            />
          ) : null}
          <Button
            // DropdownButton
            type="primary"
            // icon={<DownOutlined />}
            onClick={handleRequest}
            // overlay={
            //   <Menu
            //     items={[
            //       {
            //         key: "1",
            //         label: t_components("http.importUrl"),
            //         icon: <LinkOutlined />,
            //       },
            //       {
            //         key: "2",
            //         label: t_components("http.showCode"),
            //         icon: <CodeOutlined />,
            //       },
            //       {
            //         key: "3",
            //         label: t_components("http.clearAll"),
            //         icon: <DeleteOutlined />,
            //       },
            //     ]}
            //   />
            // }
          >
            {t_common("send")}
          </Button>

          <Button
            // DropdownButton
            // icon={<DownOutlined />}
            // overlay={
            //   <Menu
            //     items={[
            //       {
            //         key: "0",
            //         label: (
            //           <Input
            //             value={requestSavedName}
            //             onClick={(e) => e.stopPropagation()}
            //             onChange={(e) => setRequestSavedName(e.target.value)}
            //           />
            //         ),
            //       },
            //       {
            //         key: "1",
            //         label: t_components("http.copyLink"),
            //         icon: <CopyOutlined />,
            //       },
            //       {
            //         key: "2",
            //         label: t_components("http.viewMyLinks"),
            //         icon: <LinkOutlined />,
            //       },
            //       {
            //         key: "3",
            //         label: t_components("http.saveAs"),
            //         icon: <SaveOutlined />,
            //       },
            //     ]}
            //   />
            // }
            onClick={handleSave}
          >
            {t_common("save")}
          </Button>
        </HeaderWrapper>

        <Tabs defaultActiveKey="1">
          <TabPane
            tab={
              <span>
                {t_components("http.params")}
                {!!paramsCount && <CountTag>{paramsCount}</CountTag>}
              </span>
            }
            key="0"
          >
            <FormHeader update={setRequestParams} />
            <FormTable
              bordered
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={requestParams}
              // @ts-ignore
              columns={getColumns(setRequestParams)}
            />
          </TabPane>
          <TabPane
            tab={
              <span>
                <Badge
                  dot={!!requestBody}
                  status={method === "POST" ? "success" : "default"}
                >
                  {t_components("http.requestBody")}
                </Badge>
              </span>
            }
            key="1"
          >
            <FormHeaderWrapper>
              <span>
                {t_components("http.contentType")}
                <Select
                  disabled
                  value={contentType}
                  size={"small"}
                  options={[
                    { value: "application/json", label: "application/json" },
                  ]}
                  onChange={setContentType}
                  style={{ width: "140px", marginLeft: "8px" }}
                />
              </span>
              <Button size="small" onClick={handlePrettier}>
                {t_common("prettier")}
              </Button>
            </FormHeaderWrapper>
            <CodeMirror
              value={requestBody}
              extensions={[json()]}
              theme={theme}
              height="auto"
              minHeight={"100px"}
              onChange={setRequestBody}
            />
          </TabPane>
          <TabPane
            tab={
              <span>
                {t_components("http.requestHeaders")}{" "}
                {!!headerCount && <CountTag>{headerCount}</CountTag>}
              </span>
            }
            key="2"
          >
            <FormHeader update={setRequestHeaders} />
            <FormTable
              bordered
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={requestHeaders}
              // @ts-ignore
              columns={getColumns(setRequestHeaders)}
            />
          </TabPane>
          <TabPane tab={t_components("http.authorization")} key="3" disabled>
            <CodeMirror
              value=""
              extensions={[json()]}
              theme={theme}
              height="300px"
            />
          </TabPane>
          <TabPane
            tab={t_components("http.pre-requestScript")}
            key="4"
            disabled
          >
            <CodeMirror
              value=""
              height="300px"
              extensions={[javascript()]}
              theme={theme}
            />
          </TabPane>
          <TabPane tab={t_components("http.test")} key="5" disabled>
            <CodeMirror
              value=""
              height="300px"
              extensions={[javascript()]}
              theme={theme}
            />
          </TabPane>
        </Tabs>
      </AnimateAutoHeight>

      <Divider />

      <div>
        {sent ? (
          <Spin spinning={requesting}>
            {mode === "normal" ? (
              <Response
                res={response?.data || response?.statusText}
                status={{ code: response.status, text: response.statusText }}
              />
            ) : (
              <ResponseCompare />
            )}
          </Spin>
        ) : (
          <ResponseWrapper>
            <Spin spinning={requesting}>
              <Empty
                description={
                  <Typography.Text type="secondary">
                    {t_components("http.responseNotReady")}
                  </Typography.Text>
                }
              />
            </Spin>
          </ResponseWrapper>
        )}
      </div>
    </>
  );
};

export default Http;
