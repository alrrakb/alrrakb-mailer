export const DEFAULT_TEMPLATE_HTML = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
 <head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta content="telephone=no" name="format-detection">
  <title>{{TITLE}}</title><!--[if (mso 16)]>
    <style type="text/css">
    a {text-decoration: none;}
    </style>
    <![endif]--><!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]--><!--[if gte mso 9]>
<noscript>
         <xml>
           <o:OfficeDocumentSettings>
           <o:AllowPNG></o:AllowPNG>
           <o:PixelsPerInch>96</o:PixelsPerInch>
           </o:OfficeDocumentSettings>
         </xml>
      </noscript>
<![endif]--><!--[if mso]><xml>
    <w:WordDocument xmlns:w="urn:schemas-microsoft-com:office:word">
      <w:DontUseAdvancedTypographyReadingMail/>
    </w:WordDocument>
    </xml><![endif]-->
  <style type="text/css">
    .rollover:hover .rollover-first { max-height:0px!important; display:none!important; }
    .rollover:hover .rollover-second { max-height:none!important; display:block!important; }
    .rollover span { font-size:0px; }
    u + .body img ~ div div { display:none; }
    #outlook a { padding:0; }
    span.MsoHyperlink, span.MsoHyperlinkFollowed { color:inherit; mso-style-priority:99; }
    a.es-button { mso-style-priority:100!important; text-decoration:none!important; }
    a[x-apple-data-detectors], #MessageViewBody a { color:inherit!important; text-decoration:none!important; font-size:inherit!important; font-family:inherit!important; font-weight:inherit!important; line-height:inherit!important; }
    .es-desk-hidden { display:none; float:left; overflow:hidden; width:0; max-height:0; line-height:0; mso-hide:all; }
    
    /* Custom Styling for the Greeting/Headers */
    .es-content-body h3, .es-content-body h2, .es-content-body h1 {
        font-family: arial, 'helvetica neue', helvetica, sans-serif;
        color: #79bbe0 !important;
        font-size: 20px !important;
        font-weight: bold !important;
        margin-top: 5px;
        margin-bottom: 10px;
    }
    
    /* Formatting Fixes for Tiptap Rich Text Content inside template */
    .es-content-body p, .es-content-body ul, .es-content-body ol {
        margin-top: 0;
        margin-bottom: 15px;
        line-height: 1.5;
    }
    p:empty:before { content: "\\a0"; }

    @media only screen and (max-width:600px) {
        .es-m-p0r { padding-right:0px!important } 
        *[class="gmail-fix"] { display:none!important } 
        p, a { line-height:150%!important } 
        h1, h1 a, h2, h2 a, h3, h3 a, h4, h4 a, h5, h5 a, h6, h6 a { line-height:120%!important } 
        h1 { font-size:36px!important; text-align:left } 
        h2 { font-size:26px!important; text-align:left } 
        h3 { font-size:20px!important; text-align:left } 
        h4 { font-size:24px!important; text-align:left } 
        h5 { font-size:20px!important; text-align:left } 
        h6 { font-size:16px!important; text-align:left } 
        .es-m-txt-c, .es-m-txt-c h1, .es-m-txt-c h2, .es-m-txt-c h3, .es-m-txt-c h4, .es-m-txt-c h5, .es-m-txt-c h6 { text-align:center!important } 
        .es-m-txt-r, .es-m-txt-r h1, .es-m-txt-r h2, .es-m-txt-r h3, .es-m-txt-r h4, .es-m-txt-r h5, .es-m-txt-r h6 { text-align:right!important } 
        .es-m-txt-j, .es-m-txt-j h1, .es-m-txt-j h2, .es-m-txt-j h3, .es-m-txt-j h4, .es-m-txt-j h5, .es-m-txt-j h6 { text-align:justify!important } 
        .es-m-txt-l, .es-m-txt-l h1, .es-m-txt-l h2, .es-m-txt-l h3, .es-m-txt-l h4, .es-m-txt-l h5, .es-m-txt-l h6 { text-align:left!important } 
        .es-adaptive table, .es-left, .es-right { width:100%!important } 
        .es-content table, .es-header table, .es-footer table, .es-content, .es-footer, .es-header { width:100%!important; max-width:600px!important } 
        .adapt-img { width:100%!important; height:auto!important } 
        .es-adapt-td { display:block!important; width:100%!important } 
        .es-mobile-hidden, .es-hidden { display:none!important } 
        .es-menu td { width:1%!important } 
        table.es-table-not-adapt, .esd-block-html table { width:auto!important } 
    }
  </style>
 </head>
 <body class="body" style="width:100%;height:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;padding:0;Margin:0">
  <div dir="ltr" class="es-wrapper-color" lang="en" style="background-color:#FAFAFA">
   <table width="100%" cellspacing="0" cellpadding="0" class="es-wrapper" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%;background-repeat:repeat;background-position:center top;background-color:#FAFAFA">
     <tr>
      <td valign="top" style="padding:0;Margin:0">
       <table cellspacing="0" cellpadding="0" align="center" class="es-header" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;width:100%;table-layout:fixed !important;background-color:transparent;background-repeat:repeat;background-position:center top">
         <tr>
          <td align="center" style="padding:0;Margin:0">
           <table cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" class="es-header-body" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;background-color:transparent;width:600px">
             <tr>
              <td align="left" style="Margin:0;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px">
               <table width="100%" cellspacing="0" cellpadding="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px">
                 <tr>
                  <td valign="top" align="center" class="es-m-p0r" style="padding:0;Margin:0;width:560px">
                   <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px">
                     <tr>
                      <td align="center" style="padding:0;Margin:0;font-size:0px"><img src="https://fsmazqlpismmfdddpyqe.supabase.co/storage/v1/object/public/logos/alrrakb.png" alt="Logo" title="Logo" width="150" class="adapt-img" style="display:block;font-size:12px;border:0;outline:none;text-decoration:none;margin:0"></td>
                     </tr>
                     <tr>
                      <td style="padding:0;Margin:0">
                       <table width="100%" cellspacing="0" cellpadding="0" class="es-menu" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px">
                         <tr class="links">
                          <td width="50%" valign="top" align="center" style="Margin:0;border:0;padding-top:15px;padding-bottom:15px;padding-right:5px;padding-left:5px">
                           <div style="vertical-align:middle;display:block">
                            <a target="_blank" href="tel:+966582352555" style="mso-line-height-rule:exactly;text-decoration:none;font-family:arial, 'helvetica neue', helvetica, sans-serif;display:block;color:#666666;font-size:14px">+966 58 235 2555</a>
                           </div></td>
                          <td width="50%" valign="top" align="center" style="Margin:0;border:0;padding-top:15px;padding-bottom:15px;padding-right:5px;padding-left:5px">
                           <div style="vertical-align:middle;display:block">
                            <a target="_blank" href="" style="mso-line-height-rule:exactly;text-decoration:none;font-family:arial, 'helvetica neue', helvetica, sans-serif;display:block;color:#666666;font-size:14px">C.R 010624835</a>
                           </div></td>
                         </tr>
                       </table></td>
                     </tr>
                   </table></td>
                 </tr>
               </table></td>
             </tr>
           </table></td>
         </tr>
       </table>
       <table cellspacing="0" cellpadding="0" align="center" class="es-content" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;width:100%;table-layout:fixed !important">
         <tr>
          <td align="center" style="padding:0;Margin:0">
           <table cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;background-color:#FFFFFF;border-top:10px solid #39285e;width:600px;border-bottom:10px solid #39285e" role="none">
             {{DATE_BLOCK}}
             <tr>
              <td background="https://fsmazqlpismmfdddpyqe.supabase.co/storage/v1/object/public/logos/background.png" align="left" style="padding:0;Margin:0;padding-right:20px;padding-left:20px;padding-top:20px;background-image:url(https://fsmazqlpismmfdddpyqe.supabase.co/storage/v1/object/public/logos/background.png);background-repeat:no-repeat;background-position:center top;background-size:cover">
               <table width="100%" cellspacing="0" cellpadding="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px">
                 <tr>
                  <td valign="top" align="center" style="padding:0;Margin:0;width:560px">
                   <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px">
                     <tr>
                      <td align="left" style="padding:0;Margin:0;padding-bottom:10px;padding-top:5px">
                        <!-- INJECTED BODY -->
                        <div dir="auto">{{EMAIL_CONTENT}}</div>
                      </td>
                     </tr>
                   </table></td>
                 </tr>
               </table></td>
             </tr>
           </table></td>
         </tr>
       </table>
       <table cellspacing="0" cellpadding="0" align="center" class="es-content" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;width:100%;table-layout:fixed !important">
         <tr>
          <td align="center" style="padding:0;Margin:0">
           <table cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" class="es-content-body" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;background-color:#FFFFFF;width:600px">
             <tr></tr>
             <tr>
              <td align="left" style="padding:0;Margin:0;padding-right:20px;padding-left:20px;padding-top:5px">
               <table cellspacing="0" width="100%" cellpadding="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px">
                 <tr>
                  <td align="left" style="padding:0;Margin:0;width:560px">
                   <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px">
                     <tr>
                      <td align="center" style="padding:0;Margin:0;padding-top:10px"><p style="Margin:0;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;letter-spacing:0;color:#333333;font-size:14px"></p><p style="Margin:0;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;letter-spacing:0;color:#333333;font-size:14px">TALAE ALRRAKB– Digital Marketing &amp; Hotel Booking Specialists.<br>© All rights reserved – TALAE ALRRAKB.</p></td>
                     </tr>
                   </table></td>
                 </tr>
                 <tr>
                  <td align="left" style="padding:0;Margin:0;width:560px">
                   <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px">
                     <tr>
                      <td align="center" class="es-m-txt-c" style="padding:0;Margin:0;padding-top:10px;padding-bottom:5px;font-size:0">
                       <table cellspacing="0" cellpadding="0" class="es-table-not-adapt es-social" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px">
                         <tr>
                          <td valign="top" align="center" style="padding:0;Margin:0;padding-right:10px"><a target="_blank" href="https://web.facebook.com/profile.php?id=61550634431313" style="mso-line-height-rule:exactly;text-decoration:underline;color:#5C68E2;font-size:14px"><img title="Facebook" src="https://fafxblb.stripocdn.email/content/assets/img/social-icons/logo-black/facebook-logo-black.png" alt="Fb" width="24" height="24" style="display:block;font-size:14px;border:0;outline:none;text-decoration:none;margin:0"></a></td>
                          <td valign="top" align="center" style="padding:0;Margin:0;padding-right:10px"><a target="_blank" href="https://x.com/alrrakb" style="mso-line-height-rule:exactly;text-decoration:underline;color:#5C68E2;font-size:14px"><img title="X" src="https://fafxblb.stripocdn.email/content/assets/img/social-icons/logo-black/x-logo-black.png" alt="X" width="24" height="24" style="display:block;font-size:14px;border:0;outline:none;text-decoration:none;margin:0"></a></td>
                          <td valign="top" align="center" style="padding:0;Margin:0;padding-right:10px"><a target="_blank" href="https://www.instagram.com/alrrakb/" style="mso-line-height-rule:exactly;text-decoration:underline;color:#5C68E2;font-size:14px"><img title="Instagram" src="https://fafxblb.stripocdn.email/content/assets/img/social-icons/logo-black/instagram-logo-black.png" alt="Inst" width="24" height="24" style="display:block;font-size:14px;border:0;outline:none;text-decoration:none;margin:0"></a></td>
                          <td valign="top" align="center" style="padding:0;Margin:0;padding-right:10px"><a target="_blank" href="https://wa.me/+966582352555" style="mso-line-height-rule:exactly;text-decoration:underline;color:#5C68E2;font-size:14px"><img title="Whatsapp" src="https://fafxblb.stripocdn.email/content/assets/img/messenger-icons/logo-black/whatsapp-logo-black.png" alt="Whatsapp" width="24" height="24" style="display:block;font-size:14px;border:0;outline:none;text-decoration:none;margin:0"></a></td>
                         </tr>
                       </table></td>
                     </tr>
                   </table></td>
                 </tr>
               </table></td>
             </tr>
           </table></td>
         </tr>
       </table></td>
     </tr>
   </table>
  </div>
 </body>
</html>`;

export function constructTemplateHtml(templateHtml: string | null | undefined, content: string, title: string = "Update from Tala'ea Al-Rakeb", showDate: boolean = true) {
  const baseHtml = templateHtml || DEFAULT_TEMPLATE_HTML;

  const today = new Date();
  const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;

  const dateBlock = showDate ? `
             <tr>
              <td align="center" style="padding:0;Margin:0;padding-right:20px;padding-left:20px;padding-top:30px">
               <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px">
                 <tr>
                  <td align="center" style="padding:0;Margin:0">
                   <p style="Margin:0;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;letter-spacing:0;color:#666666;font-size:14px;text-align:center">${dateStr}</p>
                  </td>
                 </tr>
               </table>
              </td>
             </tr>
  ` : `
             <tr>
              <td align="left" style="padding:0;Margin:0;padding-right:20px;padding-left:20px;padding-top:30px">
                 <!-- Date hidden -->
              </td>
             </tr>
  `;

  // Inject dir="auto" directly into every <ul> and <ol> so Gmail aligns
  // Arabic bullets to the right and English bullets to the left.
  // Gmail strips CSS on wrapper elements but respects HTML attributes on the list tags themselves.
  const processedContent = content
    ? content
      .replace(/<ul(?![^>]*\bdir=)/gi, '<ul dir="auto"')
      .replace(/<ol(?![^>]*\bdir=)/gi, '<ol dir="auto"')
    : '';

  // Always replace the standard tags
  return baseHtml
    .replace('{{TITLE}}', title)
    .replace('{{DATE_BLOCK}}', dateBlock)
    .replace('{{EMAIL_CONTENT}}', processedContent);
}
