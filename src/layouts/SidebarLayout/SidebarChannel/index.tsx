import { useContext } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { Icon } from '@iconify/react';
import AddIcon from '@mui/icons-material/Add';
import { Box, Drawer, alpha, styled, Divider, useTheme, Button, Stack, darken, Tooltip, Fab, Typography } from '@mui/material';

import Scrollbar from 'src/components/Scrollbar';
import Logo from 'src/components/LogoSign';
import ChannelAvatar from 'src/components/ChannelAvatar'
import { SidebarContext } from 'src/contexts/SidebarContext';
import { OverPageContext } from 'src/contexts/OverPageContext';

const SidebarWrapper = styled(Box)(
  ({ theme }) => `
        width: ${theme.sidebarChannel.width};
        min-width: ${theme.sidebarChannel.width};
        color: ${theme.colors.alpha.trueWhite[70]};
        position: relative;
        z-index: 7;
        height: 100%;
        // padding-bottom: 68px;
`
);
const GradientOutlineFab = styled(Fab)(
  ({ theme }) => `
    &:before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: 50%; 
      border-style: dotted;
      background: linear-gradient(90deg, #7624FE 0%, #368BFF 100%) border-box;
      -webkit-mask: 
        linear-gradient(#fff 0 0) content-box, 
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
              mask-composite: exclude; 
      transition: border-radius .2s
    }
    &:hover {
      border-radius: 16px;
      background: ${theme.colors.default.main};
    }
    &:hover:before {
      border-style: unset;
      padding: 2px;
      border-radius: 16px;
    }
    &:hover svg.MuiSvgIcon-root {
      fill: white;
    }
    background: transparent;
`
);
const GradientFab = styled(Fab)(
  ({ theme }) => `
    background: linear-gradient(90deg, #7624FE 0%, #368BFF 100%);
`
);

function SidebarChannel() {
  const { sidebarToggle, focusedChannel, toggleSidebar, setFocusChannel } = useContext(SidebarContext);
  const { setPageType } = useContext(OverPageContext)
  const closeSidebar = () => toggleSidebar();
  const theme = useTheme();
  const { pathname } = useLocation()

  const tempChannels = [{name: 'MMA'}, {name: 'DAO'}, {name: 'LEM'}]
  return (
    <>
      <SidebarWrapper
        sx={{
          display: 'table',
          boxShadow: theme.palette.mode === 'dark' ? theme.sidebar.boxShadow : 'none'
        }}
      >
        <Box sx={{ display: 'table-row', height: '100%' }}>
          <Scrollbar>
            <Box mt={3} textAlign='center'>
              <Logo width={48} />
            </Box>
            <Divider
              sx={{
                mt: theme.spacing(2),
                mx: theme.spacing(2),
                background: theme.colors.alpha.trueWhite[10]
              }}
            />
            <Stack spacing={2} mt={2} alignItems='center'>
              {
                tempChannels.map((item, _i)=>
                  <ChannelAvatar 
                    key={_i} 
                    alt={item.name} 
                    src='/static/images/avatars/2.jpg' 
                    onClick={()=>{setFocusChannel(item); setPageType('CurrentChannel')}} 
                    focused={focusedChannel&&focusedChannel.name===item.name}/>
                )
              }
              <GradientOutlineFab aria-label="add" size='medium'>
                <svg width={0} height={0}>
                  <linearGradient id="linearColors" x1={0} y1={1} x2={1} y2={1}>
                    <stop offset={0} stopColor="#7624FE" />
                    <stop offset={1} stopColor="#368BFF" />
                  </linearGradient>
                </svg>
                <AddIcon sx={{ fill: "url(#linearColors)", fontSize: 24 }}/>
              </GradientOutlineFab>
            </Stack>
          </Scrollbar>
        </Box>
        <Stack spacing={2} alignItems='center' sx={{py: 2}}>
          <Fab 
            color='primary' 
            aria-label="setting" 
            size='medium' 
            component={RouterLink} 
            to='/setting/profile' 
            sx={
              pathname.startsWith('/setting') ? { background: 'linear-gradient(90deg, #7624FE 0%, #368BFF 100%)'} : {}
            }>
            <Icon icon="ep:setting" width={28} height={28} />
          </Fab>
          <Fab color='primary' aria-label="logout" size='medium'>
            <Icon icon="clarity:sign-out-line" width={28} height={28} />
          </Fab>
        </Stack>
      </SidebarWrapper>
      {/* <Drawer
        sx={{
          boxShadow: `${theme.sidebar.boxShadow}`
        }}
        anchor={theme.direction === 'rtl' ? 'right' : 'left'}
        open={sidebarToggle}
        onClose={closeSidebar}
        variant="temporary"
        elevation={9}
      >
        <SidebarWrapper
          sx={{
            background:
              theme.palette.mode === 'dark'
                ? theme.colors.alpha.white[100]
                : darken(theme.colors.alpha.black[100], 0.5)
          }}
        >
          <Scrollbar>
            <Box mt={3}>
              <Box
                mx={2}
              >
                <Logo />
              </Box>
            </Box>
            <Divider
              sx={{
                mt: theme.spacing(3),
                mx: theme.spacing(2),
                background: theme.colors.alpha.trueWhite[10]
              }}
            />
          </Scrollbar>
        </SidebarWrapper>
      </Drawer> */}
    </>
  );
}

export default SidebarChannel;
