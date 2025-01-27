import { css } from '@emotion/react';
import { useRequest } from 'ahooks';
import { Button, Checkbox, Collapse, Form, message, Select, Spin, TimePicker } from 'antd';
import moment, { Moment } from 'moment';
import { FC, useState } from 'react';
import { useImmer } from 'use-immer';

import { decodeWeekCode, encodeWeekCode } from '../../../../helpers/record/util';
import { KeyValueType } from '../../../../pages/HttpRequest';
import AppSettingService from '../../../../services/AppSetting.service';
import { ExcludeOperationMap, QueryRecordSettingRes } from '../../../../services/AppSetting.type';
import {
  DurationInput,
  DynamicClassesEditableTable,
  ExcludeOperation,
  IntegerStepSlider,
} from './FormItem';

const { Panel } = Collapse;

export type SettingRecordProps = {
  appId: string;
  agentVersion: string;
};

type SettingFormType = {
  allowDayOfWeeks: number[];
  sampleRate: number;
  period: Moment[];
  excludeOperationMap: KeyValueType[];
  timeMock: boolean;
};

const format = 'HH:mm';

const defaultValues: Omit<
  QueryRecordSettingRes,
  | 'appId'
  | 'modifiedTime'
  | 'allowDayOfWeeks'
  | 'allowTimeOfDayFrom'
  | 'allowTimeOfDayTo'
  | 'excludeOperationMap'
> & {
  allowDayOfWeeks: number[];
  period: Moment[];
  excludeOperationMap: KeyValueType[];
} = {
  allowDayOfWeeks: [],
  sampleRate: 1,
  period: [moment('00:01', format), moment('23:59', format)],
  excludeOperationMap: [],
  timeMock: false,
};

const Record: FC<SettingRecordProps> = (props) => {
  const [initialValues, setInitialValues] = useImmer<SettingFormType>(defaultValues);
  const [loading, setLoading] = useState(false);

  useRequest(AppSettingService.queryRecordSetting, {
    defaultParams: [{ id: props.appId }],
    onBefore() {
      setLoading(true);
    },
    onSuccess(res) {
      setInitialValues({
        period: [moment(res.allowTimeOfDayFrom, format), moment(res.allowTimeOfDayTo, format)],
        sampleRate: res.sampleRate,
        allowDayOfWeeks: [],
        timeMock: res.timeMock,
        excludeOperationMap: Object.entries(res.excludeOperationMap).map(([key, value]) => ({
          key,
          value: value.join(','),
        })),
      });

      setInitialValues((state) => {
        state.allowDayOfWeeks = decodeWeekCode(res.allowDayOfWeeks);
      });

      setLoading(false);
    },
  });

  const { run: update } = useRequest(AppSettingService.updateRecordSetting, {
    manual: true,
    onSuccess(res) {
      res && message.success('Update successfully');
    },
  });

  const onFinish = (values: SettingFormType) => {
    const allowDayOfWeeks = encodeWeekCode(values.allowDayOfWeeks);
    const [allowTimeOfDayFrom, allowTimeOfDayTo] = values.period.map((m: any) => m.format(format));

    const params = {
      allowDayOfWeeks,
      allowTimeOfDayFrom,
      allowTimeOfDayTo,
      appId: props.appId,
      sampleRate: values.sampleRate,
      timeMock: values.timeMock,
      excludeOperationMap: values.excludeOperationMap.reduce<{ [key: string]: string[] }>(
        (map, cur) => {
          map[cur.key] = cur.value.split(',');
          return map;
        },
        {},
      ),
    };

    update(params);
  };
  return (
    <>
      {loading ? (
        <Spin />
      ) : (
        <Form
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 20 }}
          layout='horizontal'
          initialValues={initialValues}
          onFinish={onFinish}
          css={css`
            .ant-form-item-label > label {
              white-space: break-spaces;
            }
            .ant-checkbox-group {
            }
            .time-classes {
              label.ant-checkbox-wrapper {
                width: 220px;
                margin-right: 16px;
              }
            }
          `}
        >
          <Collapse
            bordered={false}
            defaultActiveKey={['basic']}
            css={css`
              .ant-collapse-header-text {
                font-weight: 600;
              }
            `}
          >
            <Panel header='Basic' key='basic'>
              <Form.Item label='Agent Version'>{props.agentVersion}</Form.Item>

              <Form.Item label='Duration' name='allowDayOfWeeks'>
                <DurationInput />
              </Form.Item>

              <Form.Item label='Period' name='period'>
                <TimePicker.RangePicker format={format} />
              </Form.Item>

              <Form.Item label='Frequency' name='sampleRate'>
                <IntegerStepSlider />
              </Form.Item>
            </Panel>

            {/* 此处必须 forceRender，否则如果没有打开高级设置就保存，将丢失高级设置部分字段 */}
            <Panel forceRender header='Advanced' key='advanced'>
              <Form.Item label='Exclude Operation' name='excludeOperationMap'>
                <ExcludeOperation />
              </Form.Item>

              <Form.Item label='Time Mock' name='timeMock' valuePropName='checked'>
                <Checkbox />
              </Form.Item>

              <Form.Item label='Dynamic Classes'>
                <DynamicClassesEditableTable appId={props.appId} />
              </Form.Item>
            </Panel>
          </Collapse>

          <Form.Item style={{ float: 'right', margin: '16px 0' }}>
            <Button type='primary' htmlType='submit'>
              Save
            </Button>
          </Form.Item>
        </Form>
      )}
    </>
  );
};

export default Record;
