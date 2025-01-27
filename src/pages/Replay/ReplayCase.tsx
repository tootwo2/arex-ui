import { InfoCircleOutlined } from '@ant-design/icons';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import styled from '@emotion/styled';
import CodeMirror from '@uiw/react-codemirror';
import { ReactCodeMirrorProps } from '@uiw/react-codemirror/src';
import { useRequest } from 'ahooks';
import { Col, Collapse, Row, Space, Switch } from 'antd';
import React, { FC, useMemo, useRef, useState } from 'react';

import Case from '../../components/replay/Case';
import SaveCase from '../../components/replay/SaveCase';
import {
  CheckOrCloseIcon,
  CollapseTable,
  Label,
  PanesTitle,
} from '../../components/styledComponents';
import ReplayService from '../../services/Replay.service';
import { PlanItemStatistics, ReplayCase as ReplayCaseType } from '../../services/Replay.type';
import { useStore } from '../../store';
import { ThemeClassify } from '../../style/theme';

const { Panel } = Collapse;
const InfoIcon = styled(InfoCircleOutlined)`
  color: ${(props) => props.theme.color.error};
  margin-right: 8px;
`;
const CodeViewer = styled(
  (props: ReactCodeMirrorProps & { type: 'json' | 'html'; themeKey: ThemeClassify }) => (
    <CodeMirror
      readOnly
      height='300px'
      extensions={[javascript(), html()]}
      theme={props.themeKey}
      {...props}
    />
  ),
)<{ remark?: string }>`
  :after {
    content: '${(props) => props.remark || ''}';
    position: absolute;
    bottom: 8px;
    right: 32px;
    font-size: 32px;
    font-weight: 600;
    font-style: italic;
    color: ${(props) => props.theme.color.text.watermark};
    z-index: 0;
  }
`;

const ReplayCase: FC<{ data: PlanItemStatistics }> = ({ data }) => {
  const { themeClassify } = useStore();

  const [onlyFailed, setOnlyFailed] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ReplayCaseType>();

  const saveCaseRef = useRef(null);

  const { data: compareResults = [], mutate } = useRequest(
    () =>
      ReplayService.queryFullLinkMsg({
        recordId: selectedRecord!.recordId,
        planItemId: data.planItemId,
      }),
    {
      ready: !!selectedRecord,
      refreshDeps: [selectedRecord?.recordId],
      onError() {
        mutate([]);
      },
    },
  );

  const compareResultsFiltered = useMemo(
    () => compareResults.filter((item) => !onlyFailed || item.diffResultCode !== 0),
    [onlyFailed, compareResults],
  );

  const handleClickRecord = (record: ReplayCaseType) => {
    setSelectedRecord(selectedRecord?.recordId === record.recordId ? undefined : record);
  };

  function handleClickSaveCase(record: ReplayCaseType) {
    saveCaseRef.current.openModal(record);
  }

  return (
    <Space direction='vertical' style={{ display: 'flex', paddingBottom: '16px' }}>
      <PanesTitle
        title={<span>Main Service API: {data.operationName}</span>}
        extra={
          <span>
            <Label>View Failed Only</Label>
            <Switch size='small' defaultChecked={onlyFailed} onChange={setOnlyFailed} />
          </span>
        }
      />

      <CollapseTable
        active={!!selectedRecord}
        table={
          <Case
            planItemId={data.planItemId}
            onClick={handleClickRecord}
            onClickSaveCase={handleClickSaveCase}
          />
        }
        panel={
          <Collapse>
            {compareResultsFiltered.map((result, i) =>
              result.diffResultCode === 2 ? (
                <Panel
                  header={
                    <span>
                      <InfoIcon />
                      {result.logs?.length && result.logs[0].logInfo}
                    </span>
                  }
                  key={i}
                />
              ) : (
                <Panel
                  header={
                    <span>
                      <CheckOrCloseIcon checked={!result.diffResultCode} />
                      {result?.operationName}
                    </span>
                  }
                  key={i}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <CodeViewer
                        type={result.type}
                        value={result.baseMsg}
                        themeKey={themeClassify}
                        remark='Benchmark'
                      />
                    </Col>
                    <Col span={12}>
                      <CodeViewer
                        type={result.type}
                        value={result.testMsg}
                        themeKey={themeClassify}
                        remark='Test'
                      />
                    </Col>
                  </Row>
                </Panel>
              ),
            )}
          </Collapse>
        }
      />
      <SaveCase cRef={saveCaseRef} />
    </Space>
  );
};

export default ReplayCase;
