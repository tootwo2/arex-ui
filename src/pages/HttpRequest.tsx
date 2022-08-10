import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import CodeMirror from '@uiw/react-codemirror';
import { useRequest } from 'ahooks';
import {
  Badge,
  Breadcrumb,
  Button,
  Divider,
  Empty,
  Input,
  message,
  Select,
  Spin,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useImmer } from 'use-immer';

import { AnimateAutoHeight } from '../components';
import {
  FormHeader,
  FormHeaderWrapper,
  FormTable,
  getColumns,
  Response,
  ResponseCompare,
  SaveRequestButton,
  ResponseTest,
} from '../components/httpRequest';
import { Label } from '../components/styledComponents';
import { ContentTypeEnum, MethodEnum, METHODS, NodeType } from '../constant';
import { treeFindPath } from '../helpers/collection/util';
import { runTestScript } from '../helpers/sandbox';
import { FileSystemService } from '../services/FileSystem.service';
import { useStore } from '../store';
import { tryParseJsonString, tryPrettierJsonString } from '../utils';
import AgentAxios from '../utils/request';
import { NodeList } from '../vite-env';
import { readableBytes } from '../helpers/http/responseMeta';

const { TabPane } = Tabs;

export enum HttpRequestMode {
  Normal = 'normal',
  Compare = 'compare',
}

export type HttpRequestProps = {
  mode?: HttpRequestMode;
  id: string;
  isNew?: boolean;
  collectionTreeData: NodeList[];
  onSaveAs: (pane: PaneType) => void;
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

// 注
// mode：有两种模式，normal、compare
// id：request的id，组件加载时拉一次数据
// isNew：是否为新增的request
// collectionTreeData：集合树形结构数据。作用是通过id可查询出节点路径，用于显示面包屑之类的
const HttpRequest: FC<HttpRequestProps> = ({
  id,
  isNew,
  collectionTreeData,
  mode: defaultMode = HttpRequestMode.Normal,
  onSaveAs,
}) => {
  const { theme, extensionInstalled } = useStore();
  const { t: t_common } = useTranslation('common');
  const { t: t_components } = useTranslation('components');

  const [mode, setMode] = useState(defaultMode);
  // 如果是case(2)类型的话，就一定有一个父节点，类型也一定是request(1)
  const nodeInfoInCollectionTreeData = useMemo(() => {
    const paths = treeFindPath(collectionTreeData, (node) => node.key === id);

    return {
      self: paths[paths.length - 1],
      parent: paths[paths.length - 2],
      raw: paths,
    };
  }, [collectionTreeData]);
  const [method, setMethod] = useState<typeof METHODS[number]>(MethodEnum.GET);

  const [url, setUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [testUrl, setTestUrl] = useState('');
  const [sent, setSent] = useState(false);
  const [response, setResponse] = useState<any>(); // 响应完整数据
  const [responseMeta, setResponseMeta] = useState<any>({ time: 0, size: '' }); // 响应的其他信息
  const [baseResponse, setBaseResponse] = useState<any>(); // base响应完整数据
  const [testResponse, setTestResponse] = useState<any>(); // test响应完整数据
  const [requestParams, setRequestParams] = useImmer<KeyValueType[]>([
    { key: '', value: '', active: true },
  ]);
  const [isTestResult, setIsTestResult] = useState(true);
  useEffect(() => {
    handleUpdateUrl();
    response &&
      runTestScript(TestVal, {
        status: response.status,
        body: response.body,
        headers: response.headers,
      }).then((res: any) => {
        setTestResult(res.children);
        setIsTestResult(true);
      }).catch(e=>{
        setIsTestResult(false);
      });
  }, [response]);

  const params = useMemo(
    () =>
      requestParams.reduce<ParamsObject>((acc, { key, value, active }) => {
        if (key && active) {
          acc[key] = value;
        }
        return acc;
      }, {}),
    [requestParams],
  );
  const paramsCount = useMemo(
    () =>
      requestParams.reduce((count, param) => {
        param.key && param.active && count++;
        return count;
      }, 0),
    [requestParams],
  );
  const [requestHeaders, setRequestHeaders] = useImmer<KeyValueType[]>([
    {
      key: '',
      value: '',
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
    [requestHeaders],
  );
  const headerCount = useMemo(
    () =>
      requestHeaders.reduce((count, header) => {
        header.key && header.active && count++;
        return count;
      }, 0),
    [requestHeaders],
  );

  const [contentType, setContentType] = useState(ContentTypeEnum.ApplicationJson);
  const [requestBody, setRequestBody] = useState('');

  const validationRequest = (cancel: () => void) => {
    if (!url) {
      message.warn(t_components('http.urlEmpty'));
      cancel();
    } else if (!extensionInstalled) {
      message.warn(t_components('http.extensionNotInstalled'));
      cancel();
    }
  };

  const {
    loading: requesting,
    run: request,
    cancel: cancelRequest,
  } = useRequest(AgentAxios, {
    manual: true,
    onBefore: (params) => {
      console.log(params);
      validationRequest(cancelRequest);
    },
    onSuccess: (res) => {
      setResponseMeta({
        time: new Date().getTime() - responseMeta.time,
        size: readableBytes(JSON.stringify(res.data).length),
      });
      setResponse(res);
    },
    onError(err) {
      setResponse(err?.response);
    },
    onFinally: () => {
      setSent(true);
    },
  });

  const {
    loading: baseRequesting,
    run: baseRequest,
    cancel: cancelBaseRequest,
  } = useRequest(AgentAxios, {
    manual: true,
    onBefore: () => {
      validationRequest(cancelBaseRequest);
    },
    onSuccess: (res) => {
      setBaseResponse(res);
    },
    onError(err) {
      setBaseResponse(err?.response);
    },
    onFinally: () => {
      setSent(true);
    },
  });

  const {
    loading: testRequesting,
    run: testRequest,
    cancel: cancelTestRequest,
  } = useRequest(AgentAxios, {
    manual: true,
    onBefore: () => {
      validationRequest(cancelTestRequest);
    },
    onSuccess: (res) => {
      setTestResponse(res);
    },
    onError(err) {
      setTestResponse(err?.response);
    },
    onFinally: () => {
      setSent(true);
    },
  });

  useRequest(
    () => {
      if (isNew || !nodeInfoInCollectionTreeData.self) {
        return new Promise((resolve, reject) => {
          resolve({
            body: {},
          });
        });
      }
      const { nodeType, key: id } = nodeInfoInCollectionTreeData.self;
      const { key: pid } = nodeInfoInCollectionTreeData.parent;
      if (nodeType === NodeType.interface) {
        return FileSystemService.queryInterface({ id });
      } else {
        return new Promise((resolve) => {
          FileSystemService.queryInterface({ id: pid }).then((interfaceRes) => {
            FileSystemService.queryCase({ id }).then((CaseRes) => {
              resolve({
                body: {
                  ...interfaceRes.body,
                  ...CaseRes.body,
                },
              });
            });
          });
        });
      }
    },
    {
      refreshDeps: [nodeInfoInCollectionTreeData],
      onSuccess(res: any) {
        setUrl(res.body.address?.endpoint || '');
        setMethod(res.body.address?.method || MethodEnum.GET);
        setRequestParams(res.body?.params || []);
        setRequestHeaders(res.body?.headers || []);
        setRequestBody(res.body?.body?.body || '');
        setTestUrl(res.body.testAddress?.endpoint || '');
        setBaseUrl(res.body.baseAddress?.endpoint || '');
        setTestVal(res.body.testScript || '');
        setSavedTestVal(res.body.testScript || '');
      },
    },
  );

  const { run: saveInterface } = useRequest(
    (params, nodeType: NodeType) => {
      if (nodeType === NodeType.interface) {
        return FileSystemService.saveInterface(params).then(() => message.success('保存成功'));
      } else if (nodeType === NodeType.case) {
        return FileSystemService.saveCase(params).then(() => message.success('保存成功'));
      }
    },
    {
      manual: true,
    },
  );

  const handlePrettier = () => {
    const prettier = tryPrettierJsonString(requestBody, t_common('invalidJSON'));
    prettier && setRequestBody(prettier);
  };

  const handleRequest = () => {
    const data: Partial<Record<'params' | 'data', object>> = {};
    if (method === MethodEnum.GET) {
      data.params = params;
    } else if (requestBody) {
      const body = tryParseJsonString(requestBody, t_common('invalidJSON'));
      body && (data.data = body);
    }
    setResponseMeta({ time: new Date().getTime() });
    request({
      url,
      method,
      headers,
      ...data,
    });
  };

  const handleCompareRequest = () => {
    if (!baseUrl) {
      return message.warn(t_components('http.urlEmpty'));
    }
    if (!testUrl) {
      return message.warn(t_components('http.urlEmpty'));
    }

    const data: Partial<Record<'params' | 'data', object>> = {};
    if (method === MethodEnum.GET) {
      data.params = params;
    } else if (requestBody) {
      const body = tryParseJsonString(requestBody, t_common('invalidJSON'));
      body && (data.data = body);
    }

    baseRequest({
      url: baseUrl,
      method,
      headers,
      ...data,
    });

    testRequest({
      url: testUrl,
      method,
      headers,
      ...data,
    });
  };

  const handleSave = () => {
    saveInterface(
      {
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
        baseAddress: {
          endpoint: baseUrl,
          method,
        },
        testAddress: {
          endpoint: testUrl,
          method,
        },
        headers: requestHeaders,
        params: requestParams,
        preRequestScript: null,
        testScript: TestVal,
      },
      nodeInfoInCollectionTreeData.self.nodeType,
    );
    setSavedTestVal(TestVal);
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, queryStr] = value.split('?');
    if (queryStr) {
      const query = queryStr.split('&').map((q) => {
        const [key, value] = q.split('=');
        return { key, value, active: true };
      });
      setRequestParams(query);
    }
  };

  const handleUpdateUrl = () => {
    const invalidValues = ['', undefined];
    const query = requestParams
      .filter((param) => param.active && !invalidValues.includes(param.key))
      .reduce((pre, cur, i) => {
        pre += `${i === 0 ? '?' : '&'}${cur.key}=${cur.value}`;
        return pre;
      }, '');
    setUrl(url.split('?')[0] + query);
  };

  //Test
  const [TestVal, setTestVal] = useState<string>('');
  const [TestResult, setTestResult] = useState<[]>([]);
  const [savedTestVal,setSavedTestVal] = useState<string>('');
  const getTestVal = (e: string) => {
    setTestVal(e);
  };

  return (
    <>
      <AnimateAutoHeight>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {JSON.stringify(responseMeta)}
          {nodeInfoInCollectionTreeData.raw.length > 0 ? (
            <div>
              <Breadcrumb style={{ paddingBottom: '14px' }}>
                {nodeInfoInCollectionTreeData.raw.map((i, index) => (
                  <Breadcrumb.Item key={index}>{i.title}</Breadcrumb.Item>
                ))}
              </Breadcrumb>
            </div>
          ) : (
            <div>
              <Breadcrumb style={{ paddingBottom: '14px' }}>
                <Breadcrumb.Item key={'new'}>New Request</Breadcrumb.Item>
              </Breadcrumb>
            </div>
          )}
          <div>
            {isNew ? (
              <SaveRequestButton
                reqParams={{
                  auth: null,
                  body: {
                    contentType,
                    body: requestBody,
                  },
                  address: {
                    endpoint: url,
                    method,
                  },
                  baseAddress: {
                    endpoint: baseUrl,
                    method,
                  },
                  testAddress: {
                    endpoint: testUrl,
                    method,
                  },
                  headers: requestHeaders,
                  params: requestParams,
                  preRequestScript: null,
                  testScript: null,
                }}
                collectionTreeData={collectionTreeData}
                onSaveAs={onSaveAs}
              />
            ) : (
              <Button onClick={handleSave}>{t_common('save')}</Button>
            )}
            <Divider type={'vertical'} />
            <Select
              options={[
                { label: 'Normal', value: HttpRequestMode.Normal },
                { label: 'Compare', value: HttpRequestMode.Compare },
              ]}
              value={mode}
              onChange={(val) => {
                setSent(false);
                setMode(val);
              }}
            />
          </div>
        </div>
        <Divider style={{ margin: '0', marginBottom: '8px' }} />
        {/* 普通请求 */}
        {mode === HttpRequestMode.Normal ? (
          <HeaderWrapper>
            <Select value={method} options={RequestTypeOptions} onChange={setMethod} />
            <Input
              placeholder={t_components('http.enterRequestUrl')}
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
            <Button type='primary' onClick={handleRequest}>
              {t_common('send')}
            </Button>
          </HeaderWrapper>
        ) : (
          <div>
            {/* 对比请求 */}
            <HeaderWrapper style={{ marginTop: '10px' }}>
              <Select value={method} options={RequestTypeOptions} onChange={setMethod} />
              <Input
                placeholder={t_components('http.enterRequestUrl')}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <Button type='primary' onClick={handleCompareRequest}>
                {t_common('send')}
              </Button>
              <Button onClick={handleSave} style={{ display: 'none' }}>
                {t_common('save')}
              </Button>
            </HeaderWrapper>
            <HeaderWrapper style={{ marginTop: '10px' }}>
              <Select value={method} options={RequestTypeOptions} onChange={setMethod} />
              <Input
                placeholder={t_components('http.enterRequestUrl')}
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
              />
              <Button style={{ display: 'none' }} type='primary' onClick={handleRequest}>
                {t_common('send')}
              </Button>
              <Button style={{ visibility: 'hidden' }} onClick={handleSave}>
                {t_common('save')}
              </Button>
            </HeaderWrapper>
          </div>
        )}
        <Tabs
          defaultActiveKey='1'
          css={css`
            .ant-tabs-nav {
              margin-bottom: 0px;
            }
          `}
        >
          <TabPane
            tab={
              <span>
                {t_components('http.params')}
                {!!paramsCount && <CountTag>{paramsCount}</CountTag>}
              </span>
            }
            key='0'
          >
            <FormHeader update={setRequestParams} />
            <FormTable
              bordered
              size='small'
              rowKey='id'
              pagination={false}
              dataSource={requestParams}
              columns={getColumns(setRequestParams, true)}
            />
          </TabPane>
          <TabPane
            tab={
              <>
                {/* span 若移动至 Badge 中将失去继承的主题色 */}
                <span>{t_components('http.requestBody')}</span>
                <Badge dot={!!requestBody} status={method === 'POST' ? 'success' : 'default'}>
                  {/* 空格符撑起 Badge 内部 */}&nbsp;
                </Badge>
              </>
            }
            key='1'
          >
            <FormHeaderWrapper>
              <span>
                <Label offset={-12}>{t_components('http.contentType')}</Label>
                <Select
                  disabled
                  bordered={false}
                  value={contentType}
                  size={'small'}
                  options={[{ value: 'application/json', label: 'application/json' }]}
                  onChange={setContentType}
                  style={{ width: '140px', marginLeft: '8px' }}
                />
              </span>
              <Button size='small' onClick={handlePrettier}>
                {t_common('prettier')}
              </Button>
            </FormHeaderWrapper>
            <CodeMirror
              value={requestBody}
              extensions={[json()]}
              theme={theme}
              height='auto'
              minHeight={'100px'}
              onChange={setRequestBody}
            />
          </TabPane>
          <TabPane
            tab={
              <span>
                {t_components('http.requestHeaders')}{' '}
                {!!headerCount && <CountTag>{headerCount}</CountTag>}
              </span>
            }
            key='2'
          >
            <FormHeader update={setRequestHeaders} />
            <FormTable
              bordered
              size='small'
              rowKey='id'
              pagination={false}
              dataSource={requestHeaders}
              columns={getColumns(setRequestHeaders, true)}
            />
          </TabPane>
          <TabPane tab={t_components('http.authorization')} key='3' disabled>
            <CodeMirror value='' extensions={[json()]} theme={theme} height='300px' />
          </TabPane>
          <TabPane tab={t_components('http.pre-requestScript')} key='4' disabled>
            <CodeMirror value='' height='300px' extensions={[javascript()]} theme={theme} />
          </TabPane>
          <TabPane tab={
              savedTestVal!==TestVal?<Badge dot={true} offset={[-1, 11]} color='#10B981' >
              <div css={css`padding-right: 10px;`}>{t_components('http.test')}</div>
            </Badge>:<>{t_components('http.test')}</>
            } key='5' disabled={mode===HttpRequestMode.Compare}>
            <ResponseTest getTestVal={getTestVal} OldTestVal={TestVal}></ResponseTest>
          </TabPane>
        </Tabs>
      </AnimateAutoHeight>
      <Divider />
      <div>
        {sent ? (
          <Spin spinning={requesting}>
            {mode === HttpRequestMode.Normal ? (
              <Response
                responseHeaders={response?.headers}
                res={response?.data || response?.statusText}
                status={{ code: response.status, text: response.statusText }}
                TestResult={TestResult}
                isTestResult={isTestResult}
                time={responseMeta.time > 10000 ? 0 : responseMeta.time}
                size={responseMeta.size}
              />
            ) : (
              <ResponseCompare responses={[baseResponse?.data, testResponse?.data]} />
            )}
          </Spin>
        ) : (
          <ResponseWrapper>
            <Spin spinning={requesting}>
              <Empty
                description={
                  <Typography.Text type='secondary'>
                    {t_components('http.responseNotReady')}
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

export default HttpRequest;
