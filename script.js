const Jimp = require("jimp");
const fs = require('fs');
const exec = require('child_process').execSync;

const {canvas_width, canvas_height, canvas_x, canvas_y, palette} = JSON.parse(fs.readFileSync("constants.json"));

async function main(URL) {
  //fetch URL for picture
  const res = await fetch(URL);
  let buffer = await res.arrayBuffer();
  const pic = Buffer.from(buffer);
  const image = await Jimp.read(pic);
  const width = Number(canvas_width);
  const height = Number(canvas_height);

  const resizedImage = image.cover(width, height);

  // fs.createWriteStream('test').pipe(resizedImage);
  //use robotjs to draw out picture
  // setUp(); skirbblio
  const paintedPixel = {};
  const outlineInstructions = outlineCompile(width, height, resizedImage, paintedPixel);
  // outline(outlineInstructions);
  fill(outlineInstructions, paintedPixel);
}

function outline(instructions) {
  const initialX = Number(canvas_x);
  const initialY = Number(canvas_y);
  let currentColorID = 0;
  const command = [];
  exec('xdotool mousemove 19 476 click 1');
  instructions.forEach((instruction, idx) => {
    if(instruction.color.id === 10) return;
    console.log('outlining', idx + '/' + instructions.length);
    if(currentColorID !== instruction.color.id) {
      //pick color
      chooseColor(instruction.color_x, instruction.color_y);
      currentColorID = instruction.color.id;
    }
    //draw on canvas
    exec(`xdotool mousemove ${instruction.x + initialX} ${instruction.y + initialY} click 1`);
  });
}

function fill(instructions, paintedPixel) {
  const initialX = Number(canvas_x);
  const initialY = Number(canvas_y);
  exec(`xdotool mousemove 19 545 click 1`);
  let currentColorID = 0;
  instructions.forEach((instruction, idx) => {
    if(instruction.color.id === 10) return;
    console.log('filling', idx + '/' + instructions.length);
    //check if the space directly to the right is in the paintedpixel or out of bounds
    //if it is, then we know it doesn't need to be filled
    if(instruction.x + 1 >= Number(canvas_width) || `${instruction.x + 1}, ${instruction.y}` in paintedPixel) {
      return;
    } 
    //if it isn't in painted pixel, recursively ripple through till you hit the edges, putting all the coords in painted pixel
    ripple(instruction.x + 1, instruction.y, instruction.color.id);
    //click with the appropriate color
    if(currentColorID !== instruction.color.id) {
      chooseColor(instruction.color_x, instruction.color_y);
      currentColorID = instruction.color.id;
    }
    
    exec(`xdotool mousemove ${instruction.x + 1 + initialX} ${instruction.y + initialY} click 1`);
  });

  function chooseColor(x, y) {
    exec(`xdotool mousemove 15 1009 click 1`);
    exec('sleep 2');
    exec(`xdotool mousemove ${x} ${y} click 1`);
    exec(`xdotool mousemove 1152 693 click 1`);
    exec('sleep 2');
  }

  function ripple(x,y, fillColor) {
    const queue = [];
    queue.push([x,y]);

    while(queue.length) {
      const [x,y] = queue.shift();
      //if it is in paintedPixel, then stop or out of bounds
      if(`${x},${y}` in paintedPixel || x >= Number(canvas_width) || x < 0 || y < 0 || y > Number(canvas_height)) continue;
      //add to paintedPIxel with appropriate fill color
      paintedPixel[`${x},${y}`] = fillColor;
      //only need to go right, left, up, and down
      queue.push([x+1, y]);
      queue.push([x-1, y]);
      queue.push([x, y+1]);
      queue.push([x, y-1]);
    }
  }
}

function setUp() {
  exec('xdotool mousemove 901 899 click 1 && sleep 1 && xdotool mousemove 901 645 click 1');
}

function outlineCompile(width, height, image, paintedPixel) {
  //traverse through the image
  const commands = [];
  for(let y = 0; y < height; y++) {
    for(let x = 0; x < width; x++) {
      const rgba = Jimp.intToRGBA(image.getPixelColor(x,y))
      const color = pickColor(rgba);
      //get left, right, up, down and see if it's the same
      if(
        !color ||
        (x > 0 && x < Number(canvas_width) && y > 0 && y < Number(canvas_height)) && 
        (color.id === pickColor(Jimp.intToRGBA(image.getPixelColor(x - 1, y)))?.id && 
        color.id === pickColor(Jimp.intToRGBA(image.getPixelColor(x + 1, y)))?.id && 
        color.id === pickColor(Jimp.intToRGBA(image.getPixelColor(x, y - 1)))?.id && 
        color.id === pickColor(Jimp.intToRGBA(image.getPixelColor(x, y + 1)))?.id)
      ) {
        continue;
      }
      const command = {
        x,
        y,
        color
      };
      paintedPixel[`${x},${y}`] = color.id;
      commands.push(command);
    }
  }
  commands.sort((a,b) => a.color.id - b.color.id);
  return commands;
}

function pickColor(rgba) {
  const {r,g,b,a} = rgba;
  if(a !== 255) return;
  const {result} =  palette.reduce((acc, curr) => {
    const [r2, g2, b2] = curr.rgb;
    const distance = Math.sqrt((r-r2)**2 + (g-g2)**2 + (b-b2)**2);
    if(distance <= acc.distance) {
      acc.result = curr;
      acc.distance = distance;
    }
    return acc;
  }, {distance: Infinity, result: null});

  //skip white
  // if(result.id === 2) return; 

  return {
    id: result.id,
    color_x: result.x,
    color_y: result.y
  }
}

main(process.argv[2]);
