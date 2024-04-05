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

  // console.log('color', Jimp.intToRGBA(image.getPixelColor(0,0)));
  // fs.createWriteStream('test').pipe(resizedImage);
  //use robotjs to draw out picture
  // setUp(); skirbblio
  const instructions = compile(width, height, resizedImage);
  draw(instructions);
}

function draw(instructions) {
  const initialX = Number(canvas_x);
  const initialY = Number(canvas_y);
  console.log(instructions);
  let currentColorID = 0;
  instructions.forEach((instruction, idx) => {
    console.log(idx + 1 + '/' + instructions.length);
    if(currentColorID !== instruction.color.id) {
      //pick color
      // exec(`xdotool mousemove ${instruction.color.color_x} ${instruction.color.color_y}`); skirbbio
      // exec(`xdotool click 1 `);
      exec(`xdotool mousemove 22 1057 click 1`)
      exec(`xdotool mousemove ${instruction.color.color_x} ${instruction.color.color_y} click 1`)
      exec(`xdotool mousemove 22 1057 click 1`)
      currentColorID = instruction.color.id;
    }
    //draw on canvas
    exec(`xdotool mousemove ${instruction.x + initialX} ${instruction.y + initialY} click 1`);
  });
}

function setUp() {
  exec('xdotool mousemove 901 899 click 1 && sleep 1 && xdotool mousemove 901 645 click 1');
}

function compile(width, height, image) {
  //traverse through the image
  const commands = [];
  for(let y = 0; y < height; y++) {
    for(let x = 0; x < width; x++) {
      const rgba = Jimp.intToRGBA(image.getPixelColor(x,y))
      const color = pickColor(rgba);
      if(!color) continue;
      const command = {
        x,
        y,
        color
      };
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
  
  //don't record white
  if(result.id === 36) return;

  return {
    id: result.id,
    color_x: result.x,
    color_y: result.y
  }
}

main(process.argv[2]);
