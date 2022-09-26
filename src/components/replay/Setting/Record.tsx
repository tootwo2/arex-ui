import { css } from '@emotion/react';
import { useRequest } from 'ahooks';
import { Button, Checkbox, Collapse, Form, message, Select, Spin, TimePicker } from 'antd';
import moment, { Moment } from 'moment';
import { FC } from 'react';
import { useImmer } from 'use-immer';

import ReplayService from '../../../services/Replay.service';
import { QueryRecordSettingRes } from '../../../services/Replay.type';
import { DurationInput, IntegerStepSlider } from './FormItem';
import DynamicClassesEditableTable from './FormItem/DynamicClassesEditableTable';

const { Panel } = Collapse;

export type SettingRecordProps = {
  appId: string;
  agentVersion: string;
};

type SettingFormType = {
  allowDayOfWeeks: number[];
  sampleRate: number;
  period: Moment[];
  excludeOperationSet: string[];
  excludeDependentOperationSet: string[];
  excludeDependentServiceSet: string[];
  includeOperationSet: string[];
  includeServiceSet: string[];
  timeMock: boolean;
};

const format = 'HH:mm';

const defaultValues: Omit<
  QueryRecordSettingRes,
  'appId' | 'modifiedTime' | 'allowDayOfWeeks' | 'allowTimeOfDayFrom' | 'allowTimeOfDayTo'
> & {
  allowDayOfWeeks: number[];
  period: Moment[];
} = {
  allowDayOfWeeks: [],
  sampleRate: 1,
  period: [moment('00:01', format), moment('23:59', format)],
  excludeOperationSet: [],
  excludeDependentOperationSet: [],
  excludeDependentServiceSet: [],
  includeOperationSet: [],
  includeServiceSet: [],
  timeMock: false,
};

const Record: FC<SettingRecordProps> = (props) => {
  const [initialValues, setInitialValues] = useImmer<SettingFormType>(defaultValues);

  const { loading } = useRequest(ReplayService.queryRecordSetting, {
    defaultParams: [{ id: props.appId }],
    onSuccess(res) {
      setInitialValues(() => ({
        period: [moment(res.allowTimeOfDayFrom, format), moment(res.allowTimeOfDayTo, format)],
        sampleRate: res.sampleRate,
        allowDayOfWeeks: [],
        excludeOperationSet: res.excludeOperationSet,
        excludeDependentOperationSet: res.excludeDependentOperationSet,
        excludeDependentServiceSet: res.excludeDependentServiceSet,
        includeOperationSet: res.includeOperationSet,
        includeServiceSet: res.includeServiceSet,
        timeMock: res.timeMock,
      }));

      // decode allowDayOfWeeks
      const allowDayOfWeeks: number[] = [];
      res.allowDayOfWeeks
        .toString(2)
        .padStart(7)
        .split('')
        .forEach((status, index) => status === '1' && allowDayOfWeeks.push(index));
      setInitialValues((state) => {
        state.allowDayOfWeeks = allowDayOfWeeks;
      });
    },
  });

  const { run: update } = useRequest(ReplayService.updateRecordSetting, {
    manual: true,
    onSuccess(res) {
      res && message.success('Update successfully');
    },
  });

  const onFinish = (values: SettingFormType) => {
    const allowDayOfWeeks = parseInt(
      Array(7)
        .fill(0)
        .map((n, i) => Number(values.allowDayOfWeeks.includes(i)))
        .join(''),
      2,
    );
    const [allowTimeOfDayFrom, allowTimeOfDayTo] = values.period.map((m: any) => m.format(format));

    const params = {
      allowDayOfWeeks,
      allowTimeOfDayFrom,
      allowTimeOfDayTo,
      appId: props.appId,
      sampleRate: values.sampleRate,
      timeMock: values.timeMock,
      excludeDependentOperationSet: values.excludeDependentOperationSet,
      excludeDependentServiceSet: values.excludeDependentServiceSet,
      excludeOperationSet: values.excludeOperationSet,
      includeOperationSet: values.includeOperationSet,
      includeServiceSet: values.includeServiceSet,
    };

    console.log({ params });

    update(params);
  };
  return (
    <>
      {loading ? (
        <Spin />
      ) : (
        <Form
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 18 }}
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
              <Form.Item label='API to Record' name='includeOperationSet'>
                <Select mode='tags' style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item label='API not to Record' name='excludeOperationSet'>
                <Select mode='tags' style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item label='Dependent API not to Record' name='excludeDependentOperationSet'>
                <Select mode='tags' style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item label='Services to Record' name='includeServiceSet'>
                <Select mode='tags' style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item label='Dependent Services not to Record' name='excludeDependentServiceSet'>
                <Select mode='tags' style={{ width: '100%' }} />
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