import styled from '@emotion/styled';

import CheckOrCloseIcon from '../styledComponents/CheckOrCloseIcon';

const FooterWrapper = styled.div`
  height: 26px;
  width: 100%;
  line-height: 26px;
  font-size: 12px;
  border-top: 1px solid ${(props) => props.theme.color.border.primary};
  display: flex;
  justify-content: space-between;
  z-index: 1000;
  .footer_right {
    margin-right: 12px;
    span {
      color: #6b6b6b;
      margin-left: 6px;
    }
    span[role='img'] {
      color: rgb(82, 196, 26);
    }
  }
`;
const AppFooter = () => {
  return (
    <FooterWrapper>
      <div className='footer_left'></div>
      <div className='footer_right'>
        <span>
          <CheckOrCloseIcon checked={window.__AREX_EXTENSION_INSTALLED__} />
          Browser Agent
        </span>
      </div>
    </FooterWrapper>
  );
};

export default AppFooter;
