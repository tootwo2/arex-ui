import { css } from '@emotion/react';
import { Badge, Card, Spin, Tree } from 'antd';
import { TreeProps } from 'antd/es';
import { DataNode } from 'antd/lib/tree';
import React, { FC } from 'react';

import { SortNode } from '../../../../services/AppSetting.type';
import { useStore } from '../../../../store';

type ResponseTreeProps = Omit<TreeProps, 'treeData'> & {
  sortNodeList?: SortNode[];
  loading?: boolean;
  treeData: object;
  title?: string;
  onEditResponse?: () => void;
};

const ArrayTree: FC<ResponseTreeProps> = (props) => {
  const {
    userInfo: {
      profile: { theme },
    },
  } = useStore();

  function getNodes(object: object, basePath = ''): DataNode[] {
    const entries = Object.entries(object).filter(([, value]) => Array.isArray(value));
    return entries.map(([key, value]) => {
      const path = basePath + key + '/';
      return value && typeof value === 'object'
        ? {
            title: key,
            key: path,
            children: getNodes(value, path),
            icon: props.sortNodeList?.find((node) => node.path === path)?.pathKeyList?.length && (
              <Badge color={theme.split('-')[1]} />
            ), // 已配置过的节点使用圆点进行提示
          }
        : { title: key, key: path, value };
    });
  }

  return (
    <Card
      bordered={false}
      title={`${props.title} (click node to ignore)`}
      bodyStyle={{ padding: '8px 16px' }}
      headStyle={{ padding: '0 16px', margin: '-8px 0' }}
    >
      <Spin spinning={props.loading}>
        <Tree
          showIcon
          defaultExpandAll
          {...props}
          selectedKeys={[]}
          treeData={getNodes(props.treeData, '')}
          css={css`
            .ant-tree-icon__customize {
              position: absolute;
              left: -16px;
            }
          `}
        />
      </Spin>
    </Card>
  );
};

export default ArrayTree;
