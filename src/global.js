import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  *,
  *::after,
  *::before {
    box-sizing: border-box;
  }

  body {
    background: ${({ theme }) => theme.body};
    color: ${({ theme }) => theme.text};
    font-family: BlinkMacSystemFont, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    transition: all 0.25s linear;
  }
  
  div.field.semantic-react-form-input label{
    color: ${({theme}) => theme.text} !important;
  }

  div.field.semantic-react-form-input div.ui.input input{
    color: ${({theme}) => theme.text} !important;
    background-color: ${({theme}) => theme.input} !important;
  }

  div.react-nav-tab{
    background-color: ${({theme}) => theme.body} !important; 
    color: white !important;
  }

  div.react-nav-tab div.nav-item a.nav-link.active{
    background-color: ${({theme}) => theme.input} !important;
  }

  div.react-nav-tab div.nav-item a.nav-link:visited{
    color:${({theme}) => theme.text} !important;
  }

  div.react-nav-tab div.nav-item a.nav-link:link{
    color:${({theme}) => theme.text} !important;
  }

  div.react-card{
    background-color: ${({theme}) => theme.body} !important;
  }
  
  button.semantic-react-button{
    background-color: ${({theme}) => theme.input} !important;
    color: ${({theme}) => theme.text} !important
  }
`