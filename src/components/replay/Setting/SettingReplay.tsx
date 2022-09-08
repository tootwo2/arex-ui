import { useMount } from 'ahooks';
import { Button, Card, Checkbox, Form, Input, InputNumber, message } from 'antd';
import React from 'react';

import ReplayService from '../../../services/Replay.service';
import { SettingRecordProps } from './SettingRecord';

const SettingReplay: React.FC<SettingRecordProps> = ({ id, agentVersion }) => {
  const onFinish = (values: any) => {
    ReplayService.configScheduleModifyUpdate({
      appId: id,
      offsetDays: values.offsetDays,
      targetEnv: [],
      sendMaxQps: 20,
    }).then((res) => {
      console.log(res);
      if (res) {
        message.success('update success');
      }
    });
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo);
  };

  const [form] = Form.useForm();

  useMount(() => {
    ReplayService.queryScheduleUseResultAppId({ id: id }).then((res) => {
      form.setFieldsValue({
        offsetDays: res.offsetDays,
      });
    });
  });

  return (
    <Form
      form={form}
      name='basic'
      labelCol={{ span: 4 }}
      wrapperCol={{ span: 20 }}
      initialValues={{ remember: true }}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      autoComplete='off'
    >
      <Form.Item label='Agent Version'>
        <span>{agentVersion}</span>
      </Form.Item>

      <Form.Item
        label='Case range'
        name='offsetDays'
        rules={[{ required: true, message: 'Please input your case range!' }]}
      >
        <InputNumber />
      </Form.Item>

      <Form.Item wrapperCol={{ offset: 8, span: 16 }} style={{ textAlign: 'right' }}>
        <Button type='primary' htmlType='submit'>
          Save
        </Button>
      </Form.Item>
    </Form>
  );
};

export default SettingReplay;