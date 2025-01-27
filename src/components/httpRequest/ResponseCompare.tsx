import { Radio, Table, Tabs } from 'antd';
import { useEffect, useRef, useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer';

import request from '../../api/axios';
import { useStore } from '../../store';
const { TabPane } = Tabs;

const onChange = (key: string) => {};

const ResponseCompare = ({ responses }) => {
  const diffView = useRef<HTMLDivElement>();
  useEffect(() => {
    if (!diffView.current) {
      return;
    }
  }, [responses]);

  const columns = [
    {
      title: 'Left Path',
      dataIndex: 'pathPair',
      key: 'pathPair',
      render(pathPair) {
        const leftArr = [];
        for (let i = 0; i < pathPair.leftUnmatchedPath.length; i++) {
          leftArr.push(
            pathPair.leftUnmatchedPath[i].nodeName
              ? pathPair.leftUnmatchedPath[i].nodeName
              : pathPair.leftUnmatchedPath[i].index,
          );
        }
        return <div>{leftArr.join('.')}</div>;
      },
    },
    {
      title: 'Right Path',
      dataIndex: 'pathPair',
      key: 'pathPair',
      render(pathPair) {
        const rightArr = [];
        for (let i = 0; i < pathPair.rightUnmatchedPath.length; i++) {
          rightArr.push(
            pathPair.rightUnmatchedPath[i].nodeName
              ? pathPair.rightUnmatchedPath[i].nodeName
              : pathPair.rightUnmatchedPath[i].index,
          );
        }
        return <div>{rightArr.join('.')}</div>;
      },
    },
    {
      title: 'Left Value',
      dataIndex: 'baseValue',
      key: 'baseValue',
    },
    {
      title: 'Right Value',
      dataIndex: 'testValue',
      key: 'testValue',
    },
    {
      title: 'Difference',
      dataIndex: 'logInfo',
      key: 'logInfo',
    },
  ];

  const [activeRadio, setActiveRadio] = useState<string>('json');
  const [dataSource, setDataSource] = useState<any>([]);
  const optionsWithDisabled = [
    { label: 'JSON', value: 'json' },
    { label: 'Table', value: 'table' },
  ];

  function abc(aa) {
    for (const key in aa) {
      if (aa[key] === null) {
        aa[key] = '';
      }
      if (typeof aa[key] == 'object') {
        abc(aa[key]);
      }
    }
    return aa;
  }
  useEffect(() => {
    if (responses[0] && responses[1]) {
      const params = {
        msgCombination: {
          baseMsg: JSON.stringify(abc(responses[0])),
          testMsg: JSON.stringify(abc(responses[1])),
        },
      };
      request.post('/api/compare/quickCompare', params).then((res) => {
        setDataSource(res.body.diffDetails.map((i) => i.logs[0]));
      });
    }
  }, [responses]);
  return (
    <div>
      <Tabs defaultActiveKey='1' onChange={onChange}>
        <TabPane tab='Compare Result' key='1'>
          <div id='wrapper'>
            <div style={{ textAlign: 'right', marginBottom: '10px' }}>
              <Radio.Group
                size={'small'}
                options={optionsWithDisabled}
                onChange={(val) => {
                  setActiveRadio(val.target.value);
                }}
                value={activeRadio}
                optionType='button'
                buttonStyle='solid'
              />
            </div>

            <div
              className='react-diff-code-view'
              style={{ height: '100%', display: activeRadio === 'json' ? 'block' : 'none' }}
            >
              <ReactDiffViewer
                oldValue={JSON.stringify(responses[0], null, 2)}
                newValue={JSON.stringify(responses[1], null, 2)}
                splitView={true}
              />
            </div>
            <div style={{ display: activeRadio === 'table' ? 'block' : 'none' }}>
              <Table dataSource={dataSource} columns={columns} />
            </div>
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ResponseCompare;
