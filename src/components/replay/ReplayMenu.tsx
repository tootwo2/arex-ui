import { FC, useMemo } from 'react';

import ReplayService from '../../services/Replay.service';
import { ApplicationDataType } from '../../services/Replay.type';
import MenuSelect from '../MenuSelect';

const ReplayMenu: FC<{
  value?: string;
  onSelect: (app: ApplicationDataType) => void;
}> = (props) => {
  const selectedKeys = useMemo(() => (props.value ? [props.value] : []), [props.value]);

  return (
    <MenuSelect<ApplicationDataType>
      refresh
      rowKey='id'
      initValue={props.value}
      selectedKeys={selectedKeys}
      onSelect={props.onSelect}
      placeholder='applicationsMenu.appFilterPlaceholder'
      request={ReplayService.regressionList}
      filter={(keyword, app) => app.appName.includes(keyword) || app.appId.includes(keyword)}
      itemRender={(app) => ({
        label: app.appId,
        key: app.id,
      })}
      sx={{
        padding: '8px 0 8px 8px',
      }}
    />
  );
};

export default ReplayMenu;
